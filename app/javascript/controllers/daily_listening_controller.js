import { Controller } from "@hotwired/stimulus"

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

    // Clear any existing content
    container.innerHTML = ""

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

    // Create scales
    const xScale = d3.scaleBand()
      .domain(d3.range(7))
      .range([0, chartWidth])
      .padding(0.1)

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data)])
      .nice()
      .range([chartHeight, 0])

    // Create color scale based on intensity
    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(data)])
      .interpolator(d3.interpolateRgb("#1ed760", "#1db954"))

    // Add bars
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d, i) => xScale(i))
      .attr("y", d => yScale(d))
      .attr("width", xScale.bandwidth())
      .attr("height", d => chartHeight - yScale(d))
      .attr("fill", d => colorScale(d))
      .attr("rx", 4)


    // Add X axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => days[d])

    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#fff")

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", "#fff")

    // Style axis lines
    g.selectAll(".domain, .tick line")
      .attr("stroke", "#666")

    // Add Y axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 15)
      .attr("x", -(height / 2))
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-size", "14px")
      .text("Number of Streams")

    // Add X axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-size", "14px")
  }
}
