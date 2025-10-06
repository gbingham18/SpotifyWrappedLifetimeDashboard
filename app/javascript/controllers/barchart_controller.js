import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["svg"]

  static values = {
    importId: Number,
    selectedYear: Number,
    raceType: String
  }

  connect() {
    this.barColors = [
      '#FF4C4C', '#4FC3F7', '#FFD700', '#A080FF', '#FF914D',
      '#A6FF4D', '#4DFFDF', '#FF66B2', '#F0F0F0', '#3FA9F5'
    ]
    this.lookupColorByArtistName = new Map()
    this.usedColors = new Set()
    this.imageCache = new Map()
    this.animationTimer = null
  }

  disconnect() {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer)
    }
  }

  startRace(event) {
    fetch(`/imports/${this.importIdValue}/summary/bar_chart_race?year=${this.selectedYearValue}&type=${this.raceTypeValue}`)
      .then(res => res.json())
      .then(data => this.initializeChart(data))
  }

  initializeChart(data) {
    const svg = d3.select(this.svgTarget)
    svg.style("display", "block")
    svg.selectAll("*").remove()

    const { width, height, chartWidth, chartHeight } = this.getChartDimensions()
    const g = svg.append("g").attr("transform", `translate(80,40)`)
    const x = d3.scaleLinear().range([0, chartWidth])
    const y = d3.scaleBand().range([0, chartHeight]).padding(0.1)
    const title = this.createTitle(svg, width)

    const dates = Object.keys(data).sort()
    const dataByDate = dates.map(date => data[date])

    this.runAnimation(svg, g, x, y, title, dates, dataByDate)
  }

  getChartDimensions() {
    const width = this.svgTarget.clientWidth
    const height = this.svgTarget.clientHeight || 600
    const margin = { top: 40, right: 80, bottom: 120, left: 150 }
    return {
      width,
      height,
      chartWidth: width - margin.left - margin.right,
      chartHeight: height - margin.top - margin.bottom
    }
  }

  createTitle(svg, width) {
    return svg.append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
  }

  runAnimation(svg, g, x, y, title, dates, dataByDate) {
    const cumulativeData = {}
    let dataIndex = 0

    const step = () => {
      if (dataIndex >= dates.length) return

      const top10 = this.getTop10Cumulative(dataByDate, cumulativeData, dataIndex)
      this.updateChart(svg, g, x, y, title, top10, dates[dataIndex])

      dataIndex++
      this.animationTimer = setTimeout(step, 1000)
    }

    step()
  }

  getTop10Cumulative(dataByDate, cumulativeData, index) {
    for (let i = 0; i <= index; i++) {
      const dayData = dataByDate[i]
      for (const [name, count] of Object.entries(dayData)) {
        if (!cumulativeData[name]) {
          cumulativeData[name] = { count: 0 }
        }
        cumulativeData[name].count += (count || 0)
      }
    }

    return Object.entries(cumulativeData)
      .map(([name, info]) => [name, info])
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
  }

  updateChart(svg, g, x, y, title, top10, date) {
    const labels = top10.map(d => d[0])
    const values = top10.map(d => d[1].count)

    this.updateColors(labels)
    this.updateImages(svg, y, top10)

    x.domain([0, d3.max(values)])
    y.domain(labels)

    title.text(`Top 10 ${this.raceTypeValue} (Cumulative) – ${date}`)

    this.updateBars(g, x, y, top10)
    this.updateLabels(g, x, y, top10)
  }

  updateColors(labels) {
    for (let [artist, color] of this.lookupColorByArtistName.entries()) {
      if (!labels.includes(artist)) {
        this.lookupColorByArtistName.delete(artist)
        this.usedColors.delete(color)
      }
    }

    labels.forEach(label => {
      if (!this.lookupColorByArtistName.has(label)) {
        const availableColor = this.barColors.find(c => !this.usedColors.has(c))
        this.lookupColorByArtistName.set(label, availableColor || "#999999")
        this.usedColors.add(availableColor)
      }
    })
  }

  updateImages(svg, y, top10) {
    d3.select("#barChartImages").remove()
    const imageGroup = svg.append("g").attr("id", "barChartImages")

    top10.forEach(([name, info]) => {
      const yPos = y(name)
      if (yPos === undefined) return

      if (this.imageCache.has(name)) {
        const imageUrl = this.imageCache.get(name)
        if (imageUrl) {
          this.appendImage(imageGroup, imageUrl, yPos)
        }
      } else {
        this.fetchAndCacheImage(name, imageGroup, y)
      }
    })
  }

  fetchAndCacheImage(name, imageGroup, y) {
    const endpoint = this.raceTypeValue === "Artists" ? "/spotify/artist_image" : "/spotify/track_image"

    fetch(`${endpoint}?name=${encodeURIComponent(name)}`)
      .then(res => res.json())
      .then(data => {
        const imageUrl = data.thumbnail_url
        this.imageCache.set(name, imageUrl || null)
        if (imageUrl) {
          this.appendImage(imageGroup, imageUrl, y(name))
        }
      })
      .catch(err => {
        console.error("Error loading image for", name, err)
        this.imageCache.set(name, null)
      })
  }

  updateBars(g, x, y, top10) {
    const bars = g.selectAll("rect").data(top10, d => d[0])

    bars.enter()
      .append("rect")
      .attr("y", d => y(d[0]))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", d => x(d[1].count))
      .attr("fill", d => this.lookupColorByArtistName.get(d[0]))
      .merge(bars)
      .transition()
      .duration(800)
      .attr("y", d => y(d[0]))
      .attr("width", d => x(d[1].count))

    bars.exit().remove()
  }

  updateLabels(g, x, y, top10) {
    const MAX_CHARS_PER_LINE = 30
    const labelsSel = g.selectAll(".label").data(top10, d => d[0])

    const labelEnter = labelsSel.enter()
      .append("text")
      .attr("class", "label")
      .attr("y", d => y(d[0]) + y.bandwidth() / 2)
      .attr("dy", ".35em")

    labelEnter.merge(labelsSel)
      .transition()
      .duration(800)
      .attr("y", d => y(d[0]) + y.bandwidth() / 2)
      .attr("x", d => x(d[1].count) - 5)
      .each((d, i, nodes) => {
        const label = `${d[0]}`
        const textEl = d3.select(nodes[i])
        textEl.selectAll("tspan").remove()

        const lines = this.wrapLabel(label, MAX_CHARS_PER_LINE)
        lines[lines.length - 1] += ` (${d[1].count})`

        const barWidth = x(d[1].count)
        const temp = textEl.append("tspan").text(label)
        const textWidth = nodes[i].getComputedTextLength()
        temp.remove()

        const isTooWide = textWidth + 50 > barWidth

        textEl
          .attr("text-anchor", isTooWide ? "start" : "end")
          .attr("x", isTooWide ? barWidth + 5 : barWidth - 5)
          .attr("fill", isTooWide ? "black" : "white")

        lines.forEach((line, i) => {
          textEl.append("tspan")
            .text(line)
            .attr("x", isTooWide ? barWidth + 5 : barWidth - 5)
            .attr("dy", i === 0 ? 0 : "1.1em")
            .attr("text-anchor", isTooWide ? "start" : "end")
        })
      })

    labelsSel.exit().remove()
  }

  updateRaceType(event) {
    this.raceTypeValue = event.target.value
  }

  appendImage(imageGroup, imageUrl, yPos) {
    imageGroup.append("svg:image")
      .attr("xlink:href", imageUrl)
      .attr("x", 30)
      .attr("y", yPos + 40)
      .attr("width", 40)
      .attr("height", 40)
      .attr("clip-path", "circle(20px at 20px 20px)")
  }

  wrapLabel(text, maxChars) {
    const words = text.split(" ")
    const lines = []
    let line = ""

    words.forEach(word => {
      if ((line + word).length <= maxChars) {
        line += word + " "
      } else {
        lines.push(line.trim())
        line = word + " "
      }
    })

    if (line) lines.push(line.trim())
    return lines
  }
}
