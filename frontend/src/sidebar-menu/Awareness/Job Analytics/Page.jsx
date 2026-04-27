import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import jobAnalytics from '../../../data/job_analytics.json'
import './job-analytics.css'

const YEARS = ['2024', '2025', '2026']
const EXPERIENCE_ORDER = ['0-1 year', '1-3 years', '4-6 years', '7-9 years', '10-14 years', '14+ years']
const STACK_COLORS = ['#7dd3fc', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6', '#c4b5fd']

function StackedYearChart({ data, years, technologies }) {
  const svgRef = useRef(null)

  useEffect(() => {
    const root = svgRef.current
    if (!root || !years.length || !technologies.length) return

    const width = 820
    const height = 330
    const margin = { top: 20, right: 30, bottom: 48, left: 60 }

    const totalsByYear = years.map((year) => {
      const buckets = technologies.map((tech) => {
        const row = data.find((item) => item.Technology === tech)
        return { technology: tech, value: row ? Number(row[year] || 0) : 0 }
      })
      return { year, segments: buckets, total: d3.sum(buckets, (d) => d.value) }
    })

    const maxY = d3.max(totalsByYear, (d) => d.total) || 0
    const x = d3.scaleBand().domain(years).range([margin.left, width - margin.right]).padding(0.32)
    const y = d3.scaleLinear().domain([0, maxY * 1.1 || 1]).nice().range([height - margin.bottom, margin.top])

    const svg = d3.select(root)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .call((g) => g.selectAll('text').attr('fill', '#d8e2ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#95a8dc55'))

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format('~s')))
      .call((g) => g.selectAll('text').attr('fill', '#d8e2ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#95a8dc55'))

    const group = svg.append('g')

    totalsByYear.forEach((bucket) => {
      const barX = x(bucket.year)
      if (barX == null) return
      let cursor = y(0)

      bucket.segments.forEach((segment, idx) => {
        const barTop = y(segment.value + (bucket.segments.slice(0, idx).reduce((sum, s) => sum + s.value, 0)))
        const barBottom = cursor
        const barHeight = Math.max(0, barBottom - barTop)
        cursor = barTop

        if (barHeight <= 0) return

        group
          .append('rect')
          .attr('x', barX)
          .attr('y', barTop)
          .attr('width', x.bandwidth())
          .attr('height', barHeight)
          .attr('fill', STACK_COLORS[idx % STACK_COLORS.length])
          .append('title')
          .text(`${bucket.year} • ${segment.technology}: ${segment.value.toLocaleString()}`)
      })

      svg
        .append('text')
        .attr('x', barX + x.bandwidth() / 2)
        .attr('y', y(bucket.total) - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ecf2ff')
        .attr('font-size', 11)
        .text(d3.format('~s')(bucket.total))
    })
  }, [data, years, technologies])

  return <svg ref={svgRef} className="ja-svg-chart" role="img" aria-label="Stacked jobs by tech chart" />
}

function StackedSalaryByTechChart({ data, technologies }) {
  const svgRef = useRef(null)

  useEffect(() => {
    const root = svgRef.current
    if (!root || !technologies.length) return

    const width = 860
    const height = 360
    const margin = { top: 20, right: 24, bottom: 72, left: 52 }

    const rows = technologies.map((tech) => data.find((item) => item.technology === tech)).filter(Boolean)
    const keys = ['fresher_avg_lpa', 'intermediate_avg_lpa', 'senior_avg_lpa']
    const keyLabels = {
      fresher_avg_lpa: 'Fresher',
      intermediate_avg_lpa: 'Intermediate',
      senior_avg_lpa: 'Senior'
    }

    const stack = d3.stack().keys(keys)(rows)
    const x = d3.scaleBand().domain(rows.map((d) => d.technology)).range([margin.left, width - margin.right]).padding(0.25)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(rows, (d) => d.fresher_avg_lpa + d.intermediate_avg_lpa + d.senior_avg_lpa) * 1.12 || 1])
      .nice()
      .range([height - margin.bottom, margin.top])
    const color = d3.scaleOrdinal().domain(keys).range(['#7dd3fc', '#a78bfa', '#34d399'])

    const svg = d3.select(root)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .call((g) => g.selectAll('text').attr('fill', '#d8e2ff').attr('transform', 'rotate(-20)').attr('text-anchor', 'end'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#95a8dc55'))

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6))
      .call((g) => g.selectAll('text').attr('fill', '#d8e2ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#95a8dc55'))

    const layer = svg
      .append('g')
      .selectAll('g')
      .data(stack)
      .join('g')
      .attr('fill', (d) => color(d.key))

    layer
      .selectAll('rect')
      .data((d) => d.map((node) => ({ ...node, key: d.key })))
      .join('rect')
      .attr('x', (d) => x(d.data.technology))
      .attr('y', (d) => y(d[1]))
      .attr('height', (d) => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth())
      .append('title')
      .text((d) => `${d.data.technology} • ${keyLabels[d.key]}: ${d.data[d.key]} LPA`)
  }, [data, technologies])

  return <svg ref={svgRef} className="ja-svg-chart" role="img" aria-label="Stacked salary by technology chart" />
}

function CompanyRoleLineChart({ companyName, seriesMap, selectedRoles }) {
  const svgRef = useRef(null)

  useEffect(() => {
    const root = svgRef.current
    if (!root || !selectedRoles.length) return

    const width = 900
    const height = 390
    const margin = { top: 24, right: 24, bottom: 64, left: 56 }

    const rows = selectedRoles.map((role) => {
      const points = EXPERIENCE_ORDER.map((xp) => {
        const hit = (seriesMap[role] || []).find((entry) => entry.Experience === xp)
        return { experience: xp, value: hit ? Number(hit.Salary) : null }
      })
      return { role, points }
    })

    const maxY =
      d3.max(rows.flatMap((row) => row.points).map((point) => point.value).filter((value) => value != null)) || 0

    const x = d3.scalePoint().domain(EXPERIENCE_ORDER).range([margin.left, width - margin.right]).padding(0.5)
    const y = d3.scaleLinear().domain([0, maxY * 1.2 || 1]).nice().range([height - margin.bottom, margin.top])
    const color = d3
      .scaleOrdinal()
      .domain(selectedRoles)
      .range(['#7dd3fc', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'])

    const svg = d3.select(root)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .call((g) => g.selectAll('text').attr('fill', '#d8e2ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#95a8dc55'))

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6))
      .call((g) => g.selectAll('text').attr('fill', '#d8e2ff'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#95a8dc55'))

    const line = d3
      .line()
      .defined((d) => d.value != null)
      .x((d) => x(d.experience))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX)

    rows.forEach((row) => {
      svg
        .append('path')
        .datum(row.points)
        .attr('fill', 'none')
        .attr('stroke', color(row.role))
        .attr('stroke-width', 2.5)
        .attr('d', line)

      svg
        .append('g')
        .selectAll('circle')
        .data(row.points.filter((point) => point.value != null))
        .join('circle')
        .attr('cx', (d) => x(d.experience))
        .attr('cy', (d) => y(d.value))
        .attr('r', 4)
        .attr('fill', color(row.role))
        .append('title')
        .text((d) => `${companyName} • ${row.role} • ${d.experience}: ${d.value} LPA`)
    })
  }, [companyName, seriesMap, selectedRoles])

  return <svg ref={svgRef} className="ja-svg-chart" role="img" aria-label="Company salary trend by role chart" />
}

export default function AwarenessJobAnalyticsPage() {
  const visualizations = jobAnalytics.visualizations
  const jobsData = visualizations['1_job_trends'].data
  const salaryTechData = visualizations['4_technology_salary_levels'].data
  const companiesData = visualizations['2_salary_comparison'].data

  const techList = useMemo(() => jobsData.map((item) => item.Technology), [jobsData])
  const [selectedYears, setSelectedYears] = useState([...YEARS])
  const [selectedJobTech, setSelectedJobTech] = useState(techList.slice(0, 8))
  const [selectedSalaryTech, setSelectedSalaryTech] = useState(salaryTechData.slice(0, 8).map((item) => item.technology))

  const companyNames = useMemo(() => Object.keys(companiesData), [companiesData])
  const [selectedCompany, setSelectedCompany] = useState(companyNames[0])

  const companyRoles = useMemo(() => Object.keys(companiesData[selectedCompany] || {}), [companiesData, selectedCompany])
  const [selectedRoles, setSelectedRoles] = useState(companyRoles.slice(0, 2))

  useEffect(() => {
    setSelectedRoles((previous) => {
      const intersect = previous.filter((role) => companyRoles.includes(role))
      return intersect.length ? intersect : companyRoles.slice(0, Math.min(2, companyRoles.length))
    })
  }, [companyRoles])

  const toggleCheckboxValue = (value, selected, setSelected) => {
    setSelected((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))
  }

  return (
    <main className="job-analytics-page">
      <p className="ja-subtitle">
        Curated insights from hiring demand, company compensation trends, regional salary dynamics, and long-term
        technology salary growth.
      </p>

      <section className="ja-card">
        <h2>1) Jobs by Tech</h2>
        <p className="ja-desc">Pick years and technologies to stack hiring demand by year.</p>

        <div className="ja-control-row">
          <fieldset className="ja-control-group">
            <legend>Years</legend>
            <div className="ja-check-grid ja-check-grid--compact">
              {YEARS.map((year) => (
                <label key={year}>
                  <input
                    type="checkbox"
                    checked={selectedYears.includes(year)}
                    onChange={() => toggleCheckboxValue(year, selectedYears, setSelectedYears)}
                  />
                  {year}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="ja-control-group">
            <legend>Technologies</legend>
            <div className="ja-check-grid">
              {techList.map((tech) => (
                <label key={tech}>
                  <input
                    type="checkbox"
                    checked={selectedJobTech.includes(tech)}
                    onChange={() => toggleCheckboxValue(tech, selectedJobTech, setSelectedJobTech)}
                  />
                  {tech}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {selectedYears.length && selectedJobTech.length ? (
          <>
            <div className="ja-legend">
              {selectedJobTech.map((tech, index) => (
                <span key={tech}>
                  <i style={{ background: STACK_COLORS[index % STACK_COLORS.length] }} />
                  {tech}
                </span>
              ))}
            </div>
            <StackedYearChart data={jobsData} years={selectedYears} technologies={selectedJobTech} />
          </>
        ) : (
          <p className="ja-empty">Select at least one year and one technology to render this chart.</p>
        )}
      </section>

      <section className="ja-card">
        <h2>2) Salary by Tech</h2>
        <p className="ja-desc">Pick technologies to compare stacked fresher/intermediate/senior salary bands (LPA).</p>

        <fieldset className="ja-control-group">
          <legend>Technologies</legend>
          <div className="ja-action-row">
            <button type="button" onClick={() => setSelectedSalaryTech(salaryTechData.map((item) => item.technology))}>Select All</button>
            <button type="button" onClick={() => setSelectedSalaryTech([])}>Clear</button>
          </div>
          <div className="ja-check-grid">
            {salaryTechData.map((row) => (
              <label key={row.technology}>
                <input
                  type="checkbox"
                  checked={selectedSalaryTech.includes(row.technology)}
                  onChange={() => toggleCheckboxValue(row.technology, selectedSalaryTech, setSelectedSalaryTech)}
                />
                {row.technology}
              </label>
            ))}
          </div>
        </fieldset>

        {selectedSalaryTech.length ? (
          <>
            <div className="ja-legend">
              <span><i style={{ background: '#7dd3fc' }} />Fresher</span>
              <span><i style={{ background: '#a78bfa' }} />Intermediate</span>
              <span><i style={{ background: '#34d399' }} />Senior</span>
            </div>
            <StackedSalaryByTechChart data={salaryTechData} technologies={selectedSalaryTech} />
          </>
        ) : (
          <p className="ja-empty">Select at least one technology to render this chart.</p>
        )}
      </section>

      <section className="ja-card">
        <h2>3) Companies (Role Salary Trends)</h2>
        <p className="ja-desc">Choose a company and roles to draw salary progression across experience bands.</p>

        <div className="ja-control-row">
          <fieldset className="ja-control-group ja-company-box">
            <legend>Company</legend>
            <div className="ja-radio-grid">
              {companyNames.map((company) => (
                <label key={company}>
                  <input
                    type="radio"
                    name="company"
                    checked={selectedCompany === company}
                    onChange={() => setSelectedCompany(company)}
                  />
                  {company}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="ja-control-group ja-company-box">
            <legend>Roles</legend>
            <div className="ja-action-row">
              <button type="button" onClick={() => setSelectedRoles([...companyRoles])}>Select All Roles</button>
              <button type="button" onClick={() => setSelectedRoles([])}>Clear Roles</button>
            </div>
            <div className="ja-check-grid ja-check-grid--compact">
              {companyRoles.map((role) => (
                <label key={role}>
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleCheckboxValue(role, selectedRoles, setSelectedRoles)}
                  />
                  {role}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {selectedRoles.length ? (
          <>
            <div className="ja-legend">
              {selectedRoles.map((role, idx) => (
                <span key={role}>
                  <i style={{ background: STACK_COLORS[idx % STACK_COLORS.length] }} />
                  {role}
                </span>
              ))}
            </div>
            <CompanyRoleLineChart
              companyName={selectedCompany}
              seriesMap={companiesData[selectedCompany] || {}}
              selectedRoles={selectedRoles}
            />
          </>
        ) : (
          <p className="ja-empty">Select at least one role to plot the company trend.</p>
        )}
      </section>
    </main>
  )
}
