import { Controller } from "@hotwired/stimulus"

function token(name, fallback) {
  if (typeof getComputedStyle !== "function") return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export default class extends Controller {
  static values = {
    importId: Number,
    selectedYear: Number
  }

  static targets = ["timezoneSelect"]

  connect() {
    this.currentTimezone = "America/Los_Angeles"
    this.loadData()
  }

  changeTimezone(event) {
    this.currentTimezone = event.target.value
    this.loadData()
  }

  async loadData() {
    try {
      const response = await fetch(
        `/imports/${this.importIdValue}/summary/daily_listening_data?year=${this.selectedYearValue}&timezone=${this.currentTimezone}`
      )
      const data = await response.json()
      this.renderChart(data)
    } catch (error) {
      console.error("Error loading daily listening data:", error)
    }
  }

  renderChart(data) {
    const container = this.element.querySelector("#daily-chart")
    const width = 400
    const height = 400
    const margin = { top: 20, right: 20, bottom: 60, left: 60 }

    container.innerHTML = ""

    const accent = token("--accent", "#E0723F")
    const inkMute = token("--ink-mute", "#847C6B")
    const line = token("--line", "#2A2620")

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto")

    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    const xScale = d3.scaleBand()
      .domain(d3.range(7))
      .range([0, chartWidth])
      .padding(0.25)

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data)])
      .nice()
      .range([chartHeight, 0])

    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d, i) => xScale(i))
      .attr("y", d => yScale(d))
      .attr("width", xScale.bandwidth())
      .attr("height", d => chartHeight - yScale(d))
      .attr("fill", accent)
      .attr("rx", 2)

    const xAxis = d3.axisBottom(xScale).tickFormat(d => days[d])

    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", inkMute)
      .style("font-family", "var(--mono)")
      .style("font-size", "10px")

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll("text")
      .attr("fill", inkMute)
      .style("font-family", "var(--mono)")
      .style("font-size", "10px")

    g.selectAll(".domain").attr("stroke", line)
    g.selectAll(".tick line").attr("stroke", line)

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 15)
      .attr("x", -(height / 2))
      .attr("text-anchor", "middle")
      .attr("fill", inkMute)
      .style("font-family", "var(--sans)")
      .attr("font-size", "11px")
      .text("Streams")
  }
}
