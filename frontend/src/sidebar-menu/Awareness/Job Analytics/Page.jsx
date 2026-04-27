import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import jobAnalytics from '../../../data/job_analytics.json'
import './job-analytics.css'

const YEARS = ['2024', '2025', '2026']
const EXP_ORDER = ['0-1 year', '1-3 years', '4-6 years', '7-9 years', '10-14 years', '14+ years']
const TAB_KEYS = ['jobs', 'salary-tech', 'companies', 'geo']

const jobsPalette = { '2024': '#818cf8', '2025': '#f87171', '2026': '#34d399' }
const salaryPalette = { fresher_avg_lpa: '#818cf8', intermediate_avg_lpa: '#4ade80', senior_avg_lpa: '#f87171' }
const geoPalette = { 'Software Engineer': '#60a5fa', 'Data Engineer': '#34d399', 'Data Scientist': '#f59e0b' }

function GroupedJobsByTechChart({ data, selectedTech, selectedYears }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !selectedTech.length || !selectedYears.length) return

    const width = 930
    const height = 320
    const margin = { top: 26, right: 22, bottom: 80, left: 62 }

    const rows = selectedTech
      .map((tech) => data.find((item) => item.Technology === tech))
      .filter(Boolean)
      .map((row) => ({
        technology: row.Technology,
        values: Object.fromEntries(selectedYears.map((year) => [year, Number(row[year] || 0)]))
      }))

    const x0 = d3.scaleBand().domain(rows.map((d) => d.technology)).range([margin.left, width - margin.right]).padding(0.18)
    const x1 = d3.scaleBand().domain(selectedYears).range([0, x0.bandwidth()]).padding(0.08)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(rows.flatMap((row) => selectedYears.map((year) => row.values[year]))) * 1.1 || 1])
      .nice()
      .range([height - margin.bottom, margin.top])

    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x0))
      .call((g) => g.selectAll('text').attr('fill', '#dbe6ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#96ace130'))

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(',')))
      .call((g) => g.selectAll('text').attr('fill', '#dbe6ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#96ace130'))

    const root = svg.append('g')
    const techGroups = root.selectAll('g').data(rows).join('g').attr('transform', (d) => `translate(${x0(d.technology)},0)`)

    techGroups
      .selectAll('rect')
      .data((d) => selectedYears.map((year) => ({ technology: d.technology, year, value: d.values[year] })))
      .join('rect')
      .attr('x', (d) => x1(d.year))
      .attr('y', (d) => y(d.value))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => y(0) - y(d.value))
      .attr('fill', (d) => jobsPalette[d.year])
      .append('title')
      .text((d) => `${d.technology} • ${d.year}: ${d.value.toLocaleString()}`)
  }, [data, selectedTech, selectedYears])

  return <svg ref={ref} className="ja-svg" role="img" aria-label="Jobs by technology grouped bar chart" />
}

function GroupedSalaryByTechChart({ data, selectedTech }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !selectedTech.length) return

    const width = 930
    const height = 320
    const margin = { top: 26, right: 22, bottom: 80, left: 58 }

    const keys = ['fresher_avg_lpa', 'intermediate_avg_lpa', 'senior_avg_lpa']
    const keyLabels = {
      fresher_avg_lpa: 'Fresher',
      intermediate_avg_lpa: 'Intermediate',
      senior_avg_lpa: 'Senior'
    }

    const rows = selectedTech
      .map((tech) => data.find((item) => item.technology === tech))
      .filter(Boolean)

    const x0 = d3.scaleBand().domain(rows.map((d) => d.technology)).range([margin.left, width - margin.right]).padding(0.18)
    const x1 = d3.scaleBand().domain(keys).range([0, x0.bandwidth()]).padding(0.08)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(rows.flatMap((row) => keys.map((key) => Number(row[key] || 0)))) * 1.15 || 1])
      .nice()
      .range([height - margin.bottom, margin.top])

    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x0))
      .call((g) => g.selectAll('text').attr('fill', '#dbe6ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#96ace130'))

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6))
      .call((g) => g.selectAll('text').attr('fill', '#dbe6ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#96ace130'))

    const root = svg.append('g')
    const techGroups = root.selectAll('g').data(rows).join('g').attr('transform', (d) => `translate(${x0(d.technology)},0)`)

    techGroups
      .selectAll('rect')
      .data((d) => keys.map((key) => ({ technology: d.technology, key, value: Number(d[key]) })))
      .join('rect')
      .attr('x', (d) => x1(d.key))
      .attr('y', (d) => y(d.value))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => y(0) - y(d.value))
      .attr('fill', (d) => salaryPalette[d.key])
      .append('title')
      .text((d) => `${d.technology} • ${keyLabels[d.key]}: ${d.value} LPA`)
  }, [data, selectedTech])

  return <svg ref={ref} className="ja-svg" role="img" aria-label="Salary by technology grouped bar chart" />
}

function CompanyRolesLineChart({ company, data, selectedRoles }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !selectedRoles.length) return

    const width = 930
    const height = 320
    const margin = { top: 26, right: 22, bottom: 68, left: 58 }
    const palette = d3.scaleOrdinal().domain(selectedRoles).range(['#818cf8', '#2dd4bf', '#f59e0b', '#f87171', '#a78bfa', '#60a5fa'])

    const rows = selectedRoles.map((role) => {
      const series = EXP_ORDER.map((exp) => {
        const hit = (data[role] || []).find((entry) => entry.Experience === exp)
        return { experience: exp, value: hit ? Number(hit.Salary) : null }
      })
      return { role, series }
    })

    const maxY = d3.max(rows.flatMap((row) => row.series.map((point) => point.value).filter((v) => v != null))) || 0
    const x = d3.scalePoint().domain(EXP_ORDER).range([margin.left, width - margin.right]).padding(0.5)
    const y = d3.scaleLinear().domain([0, maxY * 1.2 || 1]).nice().range([height - margin.bottom, margin.top])

    const line = d3
      .line()
      .defined((d) => d.value != null)
      .x((d) => x(d.experience))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX)

    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .call((g) => g.selectAll('text').attr('fill', '#dbe6ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#96ace130'))

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6))
      .call((g) => g.selectAll('text').attr('fill', '#dbe6ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#96ace130'))

    rows.forEach((row) => {
      svg
        .append('path')
        .datum(row.series)
        .attr('fill', 'none')
        .attr('stroke', palette(row.role))
        .attr('stroke-width', 2.5)
        .attr('d', line)

      svg
        .append('g')
        .selectAll('circle')
        .data(row.series.filter((point) => point.value != null))
        .join('circle')
        .attr('cx', (d) => x(d.experience))
        .attr('cy', (d) => y(d.value))
        .attr('r', 4)
        .attr('fill', palette(row.role))
        .append('title')
        .text((d) => `${company} • ${row.role} • ${d.experience}: ${d.value} LPA`)
    })
  }, [company, data, selectedRoles])

  return <svg ref={ref} className="ja-svg" role="img" aria-label="Company salary trends line chart" />
}

function GeoDiversificationChart({ records }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !records.length) return

    const width = 930
    const height = 320
    const margin = { top: 26, right: 22, bottom: 80, left: 60 }
    const keys = ['Software Engineer', 'Data Engineer', 'Data Scientist']

    const x0 = d3.scaleBand().domain(records.map((d) => d.country)).range([margin.left, width - margin.right]).padding(0.18)
    const x1 = d3.scaleBand().domain(keys).range([0, x0.bandwidth()]).padding(0.08)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(records.flatMap((row) => keys.map((key) => Number(row[key] || 0)))) * 1.1 || 1])
      .nice()
      .range([height - margin.bottom, margin.top])

    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x0))
      .call((g) => g.selectAll('text').attr('fill', '#dbe6ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#96ace130'))

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format('~s')))
      .call((g) => g.selectAll('text').attr('fill', '#dbe6ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#96ace130'))

    const root = svg.append('g')
    const groups = root.selectAll('g').data(records).join('g').attr('transform', (d) => `translate(${x0(d.country)},0)`)

    groups
      .selectAll('rect')
      .data((d) => keys.map((key) => ({ country: d.country, key, value: Number(d[key]) })))
      .join('rect')
      .attr('x', (d) => x1(d.key))
      .attr('y', (d) => y(d.value))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => y(0) - y(d.value))
      .attr('fill', (d) => geoPalette[d.key])
      .append('title')
      .text((d) => `${d.country} • ${d.key}: ${d.value.toLocaleString()}`)
  }, [records])

  return <svg ref={ref} className="ja-svg" role="img" aria-label="Geo salary diversification grouped bar chart" />
}

export default function AwarenessJobAnalyticsPage() {
  const viz = jobAnalytics.visualizations
  const jobsData = viz['1_job_trends'].data
  const salaryTechData = viz['4_technology_salary_levels'].data
  const companiesData = viz['2_salary_comparison'].data
  const geoData = viz['3_geo_salary_diversification'].data

  const [activeTab, setActiveTab] = useState('jobs')

  const techList = useMemo(() => jobsData.map((item) => item.Technology), [jobsData])
  const [selectedYears, setSelectedYears] = useState(['2024', '2025'])
  const [selectedJobsTech, setSelectedJobsTech] = useState(techList.slice(0, 6))
  const [selectedSalaryTech, setSelectedSalaryTech] = useState(salaryTechData.slice(0, 6).map((item) => item.technology))

  const companies = useMemo(() => Object.keys(companiesData), [companiesData])
  const [selectedCompany, setSelectedCompany] = useState(companies[0])
  const companyRoles = useMemo(() => Object.keys(companiesData[selectedCompany] || {}), [companiesData, selectedCompany])
  const [selectedRoles, setSelectedRoles] = useState(companyRoles.slice(0, 2))

  const levels = useMemo(() => Object.keys(geoData), [geoData])
  const [selectedGeoLevel, setSelectedGeoLevel] = useState(levels[0])

  useEffect(() => {
    setSelectedRoles((prev) => {
      const overlap = prev.filter((role) => companyRoles.includes(role))
      return overlap.length ? overlap : companyRoles.slice(0, Math.min(2, companyRoles.length))
    })
  }, [companyRoles])

  const toggle = (value, setter) => setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))

  return (
    <main className="job-analytics-page">
      <div className="ja-tabs" role="tablist" aria-label="Job analytics tabs">
        <button type="button" className={activeTab === TAB_KEYS[0] ? 'is-active' : ''} onClick={() => setActiveTab(TAB_KEYS[0])}>Jobs by Tech</button>
        <button type="button" className={activeTab === TAB_KEYS[1] ? 'is-active' : ''} onClick={() => setActiveTab(TAB_KEYS[1])}>Salary by Tech</button>
        <button type="button" className={activeTab === TAB_KEYS[2] ? 'is-active' : ''} onClick={() => setActiveTab(TAB_KEYS[2])}>Companies</button>
        <button type="button" className={activeTab === TAB_KEYS[3] ? 'is-active' : ''} onClick={() => setActiveTab(TAB_KEYS[3])}>Geo Diversification</button>
      </div>

      {activeTab === 'jobs' ? (
        <section className="ja-card">
          <h2>Jobs by Tech (Grouped Bars)</h2>
          <div className="ja-controls">
            <fieldset className="ja-years-fieldset">
              <legend>Years</legend>
              <div className="ja-options ja-options--inline">
                {YEARS.map((year) => (
                  <label key={year}><input type="checkbox" checked={selectedYears.includes(year)} onChange={() => toggle(year, setSelectedYears)} />{year}</label>
                ))}
              </div>
            </fieldset>
            <fieldset className="ja-tech-fieldset">
              <legend>Technologies</legend>
              <div className="ja-options">
                {techList.map((tech) => (
                  <label key={tech}><input type="checkbox" checked={selectedJobsTech.includes(tech)} onChange={() => toggle(tech, setSelectedJobsTech)} />{tech}</label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="ja-legend">
            {selectedYears.map((year) => <span key={year}><i style={{ background: jobsPalette[year] }} />{year}</span>)}
          </div>
          {selectedYears.length && selectedJobsTech.length ? <GroupedJobsByTechChart data={jobsData} selectedTech={selectedJobsTech} selectedYears={selectedYears} /> : <p className="ja-empty">Select at least one year and one technology.</p>}
        </section>
      ) : null}

      {activeTab === 'salary-tech' ? (
        <section className="ja-card">
          <h2>Salary by Tech (Grouped Bars)</h2>
          <fieldset>
            <legend>Technologies</legend>
            <div className="ja-actions">
              <button type="button" onClick={() => setSelectedSalaryTech(salaryTechData.map((item) => item.technology))}>Select All</button>
              <button type="button" onClick={() => setSelectedSalaryTech([])}>Clear</button>
            </div>
            <div className="ja-options">
              {salaryTechData.map((row) => (
                <label key={row.technology}><input type="checkbox" checked={selectedSalaryTech.includes(row.technology)} onChange={() => toggle(row.technology, setSelectedSalaryTech)} />{row.technology}</label>
              ))}
            </div>
          </fieldset>
          <div className="ja-legend">
            <span><i style={{ background: salaryPalette.fresher_avg_lpa }} />Fresher</span>
            <span><i style={{ background: salaryPalette.intermediate_avg_lpa }} />Intermediate</span>
            <span><i style={{ background: salaryPalette.senior_avg_lpa }} />Senior</span>
          </div>
          {selectedSalaryTech.length ? <GroupedSalaryByTechChart data={salaryTechData} selectedTech={selectedSalaryTech} /> : <p className="ja-empty">Select at least one technology.</p>}
        </section>
      ) : null}

      {activeTab === 'companies' ? (
        <section className="ja-card">
          <h2>Companies (Role Salary Trends)</h2>
          <div className="ja-controls">
            <fieldset>
              <legend>Company</legend>
              <div className="ja-options ja-options--inline">
                {companies.map((company) => (
                  <label key={company}><input type="radio" name="ja-company" checked={selectedCompany === company} onChange={() => setSelectedCompany(company)} />{company}</label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Roles</legend>
              <div className="ja-actions">
                <button type="button" onClick={() => setSelectedRoles([...companyRoles])}>Select All Roles</button>
                <button type="button" onClick={() => setSelectedRoles([])}>Clear</button>
              </div>
              <div className="ja-options ja-options--inline">
                {companyRoles.map((role) => (
                  <label key={role}><input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggle(role, setSelectedRoles)} />{role}</label>
                ))}
              </div>
            </fieldset>
          </div>
          {selectedRoles.length ? <CompanyRolesLineChart company={selectedCompany} data={companiesData[selectedCompany] || {}} selectedRoles={selectedRoles} /> : <p className="ja-empty">Select at least one role.</p>}
        </section>
      ) : null}

      {activeTab === 'geo' ? (
        <section className="ja-card">
          <h2>Geo Salary Diversification</h2>
          <fieldset>
            <legend>Experience Level</legend>
            <div className="ja-options ja-options--inline">
              {levels.map((level) => (
                <label key={level}><input type="radio" name="ja-level" checked={selectedGeoLevel === level} onChange={() => setSelectedGeoLevel(level)} />{level.replace('_', ' ')}</label>
              ))}
            </div>
          </fieldset>
          <div className="ja-legend">
            <span><i style={{ background: geoPalette['Software Engineer'] }} />Software Engineer</span>
            <span><i style={{ background: geoPalette['Data Engineer'] }} />Data Engineer</span>
            <span><i style={{ background: geoPalette['Data Scientist'] }} />Data Scientist</span>
          </div>
          <GeoDiversificationChart records={geoData[selectedGeoLevel] || []} />
        </section>
      ) : null}
    </main>
  )
}
