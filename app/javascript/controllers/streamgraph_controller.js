import { Controller } from "@hotwired/stimulus"

function token(name, fallback) {
  if (typeof getComputedStyle !== "function") return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export default class extends Controller {
  static values = {
    importId: Number,
    selectedYear: Number,
    raceType: String
  }

  static targets = ["svg", "typeSelect", "entityList"]

  connect() {
    this.raceTypeValue = this.raceTypeValue || "Artists"
    this.selectedEntities = new Set()
    this.allEntities = []
    this.loadStreamGraph()
  }

  changeType(event) {
    this.raceTypeValue = event.target.value
    this.selectedEntities.clear()
    this.loadStreamGraph()
  }

  toggleEntity(entity) {
    if (this.selectedEntities.has(entity)) {
      this.selectedEntities.delete(entity)
    } else {
      this.selectedEntities.add(entity)
    }
    this.renderStreamGraph(this.cachedData)
    this.updateEntityList()
  }

  updateEntityList() {
    if (!this.hasEntityListTarget) return

    const lineSoft = token("--line-soft", "#1F1C17")
    const accent = token("--accent", "#66D46E")
    const inkSoft = token("--ink-soft", "#C9C0AB")

    const listHtml = this.allEntities.map(entity => {
      const isSelected = this.selectedEntities.has(entity)
      const action = isSelected ? '−' : '+'
      const bg = isSelected ? accent : "transparent"
      const fg = isSelected ? "var(--accent-ink)" : inkSoft
      const border = isSelected ? accent : "var(--line)"
      return `
        <div class="entity-item" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-bottom: 1px solid ${lineSoft}; font-family: var(--sans); font-size: 12px; color: var(--ink);">
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px;">${entity}</span>
          <button class="btn-toggle-item" style="background: ${bg}; color: ${fg}; border: 1px solid ${border}; border-radius: 100px; width: 22px; height: 22px; line-height: 1; font-size: 13px; font-family: var(--sans); cursor: pointer; padding: 0;" data-action="click->streamgraph#handleToggle" data-entity="${entity}">
            ${action}
          </button>
        </div>
      `
    }).join('')

    this.entityListTarget.innerHTML = listHtml
  }

  handleToggle(event) {
    const entity = event.currentTarget.dataset.entity
    this.toggleEntity(entity)
  }

  async loadStreamGraph() {
    const url = `/imports/${this.importIdValue}/summary/stream_graph_data?year=${this.selectedYearValue}&type=${this.raceTypeValue}`

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        this.cachedData = data
        this.renderStreamGraph(data)
      } else {
        console.error("Error loading stream graph data:", data.error)
      }
    } catch (error) {
      console.error("Error fetching stream graph data:", error)
    }
  }

  renderStreamGraph(rawData) {
    const svg = d3.select(this.svgTarget)
    svg.selectAll("*").remove()

    const margin = { top: 20, right: 120, bottom: 30, left: 50 }
    const width = 900 - margin.left - margin.right
    const height = 500 - margin.top - margin.bottom

    const ink = token("--ink", "#F2EDDF")
    const inkMute = token("--ink-mute", "#847C6B")
    const line = token("--line", "#2A2620")

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const dates = Object.keys(rawData).sort()
    const allEntities = new Set()

    dates.forEach(date => {
      Object.keys(rawData[date]).forEach(entity => allEntities.add(entity))
    })

    const entityTotals = {}
    allEntities.forEach(entity => {
      entityTotals[entity] = dates.reduce((sum, date) => {
        return sum + (rawData[date][entity] || 0)
      }, 0)
    })

    const sortedEntities = Object.entries(entityTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([entity]) => entity)

    this.allEntities = sortedEntities

    if (this.selectedEntities.size === 0) {
      sortedEntities.slice(0, 5).forEach(entity => this.selectedEntities.add(entity))
    }

    const topEntities = sortedEntities.filter(entity => this.selectedEntities.has(entity))

    const dataByDate = dates.map(date => {
      const obj = { date: new Date(date) }
      topEntities.forEach(entity => {
        obj[entity] = rawData[date][entity] || 0
      })
      return obj
    })

    const stack = d3.stack()
      .keys(topEntities)
      .offset(d3.stackOffsetWiggle)
      .order(d3.stackOrderInsideOut)

    const series = stack(dataByDate)

    const x = d3.scaleTime()
      .domain(d3.extent(dates, d => new Date(d)))
      .range([0, width])

    const y = d3.scaleLinear()
      .domain([
        d3.min(series, s => d3.min(s, d => d[0])),
        d3.max(series, s => d3.max(s, d => d[1]))
      ])
      .range([height, 0])

    // Warm palette for streamgraph layers — coordinated with bar race
    const warmPalette = [
      '#66D46E', '#D6A24E', '#A8B468', '#6FA88F', '#7E89B0',
      '#A47AB0', '#D77E9E', '#C2935A', '#8FD79A', '#5E8FA8',
      '#B8A07E', '#8E6F4A'
    ]
    const color = d3.scaleOrdinal()
      .domain(topEntities)
      .range(warmPalette)

    const area = d3.area()
      .x(d => x(d.data.date))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveBasis)

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "streamgraph-tooltip")
      .style("position", "absolute")
      .style("display", "none")
      .style("background", "var(--ink)")
      .style("color", "var(--bg)")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("font-family", "var(--mono)")
      .style("font-size", "11px")
      .style("pointer-events", "none")
      .style("z-index", "1000")

    g.selectAll(".layer")
      .data(series)
      .join("path")
      .attr("class", "layer")
      .attr("d", area)
      .attr("fill", d => color(d.key))
      .attr("opacity", 0.85)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 1)
        tooltip.style("display", "block").html(`<strong>${d.key}</strong>`)
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.85)
        tooltip.style("display", "none")
      })

    const xAxis = d3.axisBottom(x)
      .ticks(d3.timeMonth.every(1))
      .tickFormat(d3.timeFormat("%b"))

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", inkMute)
      .style("font-family", "var(--mono)")
      .style("font-size", "10px")

    g.selectAll(".domain").attr("stroke", line)
    g.selectAll(".tick line").attr("stroke", line)

    // Legend
    const legend = g.append("g")
      .attr("transform", `translate(${width + 10}, 0)`)

    topEntities.forEach((entity, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`)

      legendRow.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("rx", 2)
        .attr("fill", color(entity))
        .attr("opacity", 0.9)

      legendRow.append("text")
        .attr("x", 16)
        .attr("y", 9)
        .style("font-family", "var(--sans)")
        .attr("font-size", "11px")
        .attr("fill", ink)
        .text(entity.length > 15 ? entity.substring(0, 15) + "..." : entity)
    })

    this.updateEntityList()
  }
}
