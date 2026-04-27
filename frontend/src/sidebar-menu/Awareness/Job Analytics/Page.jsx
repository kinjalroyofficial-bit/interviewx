import jobAnalytics from '../../../data/job_analytics.json'
import './job-analytics.css'

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value)
const formatCurrency = (value) => `$${new Intl.NumberFormat('en-US').format(value)}`

const trendPalette = {
  '2024': '#7dd3fc',
  '2025': '#a78bfa',
  '2026': '#34d399'
}

const levelLabelMap = {
  Entry_Level: 'Entry Level',
  Mid_Level: 'Mid Level',
  Senior_Level: 'Senior Level'
}

export default function AwarenessJobAnalyticsPage() {
  const visualizations = jobAnalytics.visualizations

  const trendRows = visualizations['1_job_trends'].data
  const top2026 = [...trendRows].sort((a, b) => b['2026'] - a['2026']).slice(0, 8)
  const growthLeaders = [...trendRows]
    .map((item) => ({
      technology: item.Technology,
      absoluteGrowth: item['2026'] - item['2024'],
      growthPercent: ((item['2026'] - item['2024']) / item['2024']) * 100
    }))
    .sort((a, b) => b.growthPercent - a.growthPercent)
    .slice(0, 6)

  const allTrendValues = trendRows.flatMap((item) => [item['2024'], item['2025'], item['2026']])
  const maxTrendValue = Math.max(...allTrendValues)

  const salaryByCompany = visualizations['2_salary_comparison'].data
  const companySummary = Object.entries(salaryByCompany)
    .map(([company, roles]) => {
      const salaryPoints = Object.values(roles).flatMap((track) => track.map((entry) => entry.Salary))
      const avgSalary = salaryPoints.reduce((sum, value) => sum + value, 0) / salaryPoints.length
      const topSalary = Math.max(...salaryPoints)
      return { company, avgSalary, topSalary }
    })
    .sort((a, b) => b.avgSalary - a.avgSalary)

  const bestCompany = companySummary[0]

  const geoData = visualizations['3_geo_salary_diversification'].data
  const geoCards = Object.entries(geoData).map(([levelKey, records]) => {
    const countries = records.map((entry) => ({
      country: entry.country,
      averageSalary: Math.round((entry['Software Engineer'] + entry['Data Engineer'] + entry['Data Scientist']) / 3)
    }))
    const highest = [...countries].sort((a, b) => b.averageSalary - a.averageSalary)[0]
    const lowest = [...countries].sort((a, b) => a.averageSalary - b.averageSalary)[0]

    return {
      levelKey,
      levelLabel: levelLabelMap[levelKey] ?? levelKey,
      countries,
      highest,
      lowest
    }
  })

  const techSalaryRows = visualizations['4_technology_salary_levels'].data
  const salaryMomentum = [...techSalaryRows]
    .map((row) => ({
      technology: row.technology,
      fresher: row.fresher_avg_lpa,
      senior: row.senior_avg_lpa,
      multiplier: row.senior_avg_lpa / row.fresher_avg_lpa
    }))
    .sort((a, b) => b.multiplier - a.multiplier)
    .slice(0, 8)

  return (
    <main className="job-analytics-page">
      <header className="ja-header">
        <h1>Job Analytics Intelligence Hub</h1>
        <p>
          Curated insights from hiring demand, company compensation trends, regional salary dynamics,
          and long-term technology salary growth.
        </p>
      </header>

      <section className="ja-kpi-grid" aria-label="Top insights">
        <article className="ja-kpi-card">
          <h2>Top Hiring Tech in 2026</h2>
          <strong>{top2026[0].Technology}</strong>
          <p>{formatNumber(top2026[0]['2026'])} openings</p>
        </article>
        <article className="ja-kpi-card">
          <h2>Fastest Growth (2024 → 2026)</h2>
          <strong>{growthLeaders[0].technology}</strong>
          <p>{growthLeaders[0].growthPercent.toFixed(1)}% increase</p>
        </article>
        <article className="ja-kpi-card">
          <h2>Highest Avg Salary Company</h2>
          <strong>{bestCompany.company}</strong>
          <p>{bestCompany.avgSalary.toFixed(1)} LPA average across roles</p>
        </article>
      </section>

      <section className="ja-card">
        <div className="ja-card-heading">
          <h2>1) Job Trend Heat Bars</h2>
          <p>{visualizations['1_job_trends'].description}</p>
        </div>
        <div className="ja-legend" aria-label="Year legend">
          {Object.keys(trendPalette).map((year) => (
            <span key={year}>
              <i style={{ background: trendPalette[year] }} />
              {year}
            </span>
          ))}
        </div>
        <div className="ja-trend-table" role="table" aria-label="Top technologies and demand trend">
          {top2026.map((row) => (
            <div className="ja-trend-row" key={row.Technology}>
              <div className="ja-tech-name">{row.Technology}</div>
              {['2024', '2025', '2026'].map((year) => (
                <div key={year} className="ja-bar-wrap" title={`${year}: ${formatNumber(row[year])}`}>
                  <div
                    className="ja-bar"
                    style={{
                      width: `${(row[year] / maxTrendValue) * 100}%`,
                      background: trendPalette[year]
                    }}
                  />
                  <span>{formatNumber(row[year])}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="ja-card">
        <div className="ja-card-heading">
          <h2>2) Company Salary Comparison</h2>
          <p>{visualizations['2_salary_comparison'].description}</p>
        </div>
        <div className="ja-company-grid">
          {companySummary.map((company) => (
            <article key={company.company} className="ja-company-card">
              <h3>{company.company}</h3>
              <p>Average salary: {company.avgSalary.toFixed(1)} LPA</p>
              <p>Peak salary observed: {company.topSalary} LPA</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ja-card">
        <div className="ja-card-heading">
          <h2>3) Geo Salary Diversification</h2>
          <p>{visualizations['3_geo_salary_diversification'].description}</p>
        </div>
        <div className="ja-geo-grid">
          {geoCards.map((card) => (
            <article key={card.levelKey} className="ja-geo-card">
              <h3>{card.levelLabel}</h3>
              <p>
                Highest: {card.highest.country} ({formatCurrency(card.highest.averageSalary)})
              </p>
              <p>
                Lowest: {card.lowest.country} ({formatCurrency(card.lowest.averageSalary)})
              </p>
              <div className="ja-mini-table">
                {card.countries.map((country) => (
                  <div key={country.country}>
                    <span>{country.country}</span>
                    <strong>{formatCurrency(country.averageSalary)}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ja-card">
        <div className="ja-card-heading">
          <h2>4) Technology Salary Growth Multipliers</h2>
          <p>{visualizations['4_technology_salary_levels'].description}</p>
        </div>
        <div className="ja-momentum-list">
          {salaryMomentum.map((item) => (
            <article key={item.technology} className="ja-momentum-row">
              <div>
                <h3>{item.technology}</h3>
                <p>
                  Fresher {item.fresher.toFixed(1)} LPA → Senior {item.senior.toFixed(1)} LPA
                </p>
              </div>
              <strong>{item.multiplier.toFixed(2)}x</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
