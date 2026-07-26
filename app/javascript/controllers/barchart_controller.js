import { Controller } from "@hotwired/stimulus"

function token(name, fallback) {
  if (typeof getComputedStyle !== "function") return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export default class extends Controller {
  static targets = ["svg", "scrubber", "slider", "dateLabel"]

  static values = {
    importId: Number,
    selectedYear: Number,
    raceType: String
  }

  connect() {
    // Slightly desaturated palette so bars feel cohesive against the warm dark UI
    this.barColors = [
      '#66D46E', '#D6A24E', '#A8B468', '#6FA88F', '#7E89B0',
      '#A47AB0', '#D77E9E', '#C2935A', '#8FD79A', '#5E8FA8'
    ]
    this.lookupColorByArtistName = new Map()
    this.usedColors = new Set()
    this.imageCache = new Map()
    this.animationTimer = null
    this.showEmptyChart()
  }

  disconnect() {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer)
    }
  }

  startRace() {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer)
      this.animationTimer = null
    }

    if (this.frames && this.frames.length && this.currentIndex < this.frames.length) {
      this.playing = true
      this.runAnimation()
      return
    }

    fetch(`/imports/${this.importIdValue}/summary/bar_chart_race?year=${this.selectedYearValue}&type=${this.raceTypeValue}`)
      .then(res => res.json())
      .then(data => this.initializeChart(data))
  }

  initializeChart(data) {
    const svg = d3.select(this.svgTarget)
    svg.style("display", "block")
    svg.style("margin-left", "0")
    svg.style("margin-right", "auto")
    svg.selectAll("*").remove()

    const { width, height, chartWidth, chartHeight } = this.getChartDimensions()
    const bg2 = token("--bg-2", "#15130F")
    const line = token("--line", "#2A2620")
    const ink = token("--ink", "#F2EDDF")

    svg.attr("width", width).attr("height", height)

    const g = svg.append("g").attr("transform", `translate(-150,40)`)

    g.append("rect")
      .attr("class", "background")
      .attr("x", 0).attr("y", 0)
      .attr("width", chartWidth).attr("height", chartHeight)
      .attr("fill", bg2)

    const sectionWidth = chartWidth / 5
    for (let i = 1; i < 5; i++) {
      g.append("line")
        .attr("class", "divider")
        .attr("x1", i * sectionWidth).attr("y1", 0)
        .attr("x2", i * sectionWidth).attr("y2", chartHeight)
        .attr("stroke", line)
        .attr("stroke-width", 1)
    }

    this.x = d3.scaleLinear().range([0, chartWidth])
    this.y = d3.scaleBand().range([0, chartHeight]).padding(0.18)
    this.title = this.createTitle(svg, width)
    this.svgD3 = svg
    this.gD3 = g

    this.dateDisplay = g.append("text")
      .attr("class", "date-display")
      .attr("x", chartWidth - 10)
      .attr("y", chartHeight - 14)
      .attr("text-anchor", "end")
      .style("font-family", "var(--sans)")
      .style("font-size", "22px")
      .style("font-weight", "600")
      .style("fill", ink)

    const dates = Object.keys(data).sort()
    const dataByDate = dates.map(date => data[date])
    this.frames = this.buildFrames(dates, dataByDate)

    this.sliderTarget.max = this.frames.length - 1
    this.sliderTarget.value = 0
    this.scrubberTarget.style.display = ""

    this.currentIndex = 0
    this.playing = true
    this.runAnimation()
  }

  getChartDimensions() {
    const tileContainer = this.element.closest('.tile')
    const width = tileContainer ? tileContainer.clientWidth : 1000
    const height = 600
    const margin = { top: 0, right: -200, bottom: 0, left: 0 }
    return {
      width,
      height,
      chartWidth: width - margin.left - margin.right - 360,
      chartHeight: height - margin.top - margin.bottom - 80
    }
  }

  createTitle(svg, width) {
    return svg.append("text")
      .attr("x", (width / 2) - 240)
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .style("font-family", "var(--sans)")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("fill", token("--ink-mute", "#847C6B"))
  }

  buildFrames(dates, dataByDate) {
    const cumulativeData = {}
    return dates.map((date, i) => {
      const dayData = dataByDate[i]
      for (const [name, count] of Object.entries(dayData)) {
        if (!cumulativeData[name]) cumulativeData[name] = { count: 0 }
        cumulativeData[name].count += (count || 0)
      }
      const top10 = Object.entries(cumulativeData)
        .map(([name, info]) => [name, { count: info.count }])
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
      return { date, top10 }
    })
  }

  runAnimation() {
    const step = () => {
      if (!this.playing || this.currentIndex >= this.frames.length) {
        this.playing = false
        return
      }
      this.renderFrame(this.currentIndex)
      this.sliderTarget.value = this.currentIndex
      this.currentIndex++
      this.animationTimer = setTimeout(step, 500)
    }
    step()
  }

  scrub() {
    this.playing = false
    if (this.animationTimer) {
      clearTimeout(this.animationTimer)
      this.animationTimer = null
    }
    const index = parseInt(this.sliderTarget.value)
    this.currentIndex = index
    this.renderFrame(index)
  }

  renderFrame(index) {
    const frame = this.frames[index]
    this.updateChart(this.svgD3, this.gD3, this.x, this.y, this.title, this.dateDisplay, frame.top10, frame.date)
    const dateObj = new Date(frame.date)
    this.dateLabelTarget.textContent = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  updateChart(svg, g, x, y, title, dateDisplay, top10, date) {
    const labels = top10.map(d => d[0])
    const values = top10.map(d => d[1].count)

    this.updateColors(labels)

    x.domain([0, d3.max(values)])
    y.domain(labels)

    title.text(`Top 10 ${this.raceTypeValue} — Cumulative ${this.selectedYearValue}`)

    const dateObj = new Date(date)
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    dateDisplay.text(formattedDate)

    this.updateBars(g, x, y, top10)
    this.updateLabels(g, x, y, top10)
    this.updateImages(svg, y, top10)
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

      const defaultImage = "/assets/DefaultArtistPfp.png"
      this.appendImage(imageGroup, defaultImage, yPos, name)

      if (this.imageCache.has(name)) {
        const imageUrl = this.imageCache.get(name)
        if (imageUrl) {
          this.updateImage(imageGroup, imageUrl, yPos, name)
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
          this.updateImage(imageGroup, imageUrl, y(name), name)
        }
      })
      .catch(err => {
        console.error("Error loading image for", name, err)
        this.imageCache.set(name, null)
      })
  }

  updateImage(imageGroup, imageUrl, yPos, name) {
    imageGroup.selectAll(`[data-name="${name}"]`).remove()
    this.appendImage(imageGroup, imageUrl, yPos, name)
  }

  updateBars(g, x, y, top10) {
    const bars = g.selectAll("rect.bar").data(top10, d => d[0])

    bars.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", d => y(d[0]))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", d => x(d[1].count))
      .attr("rx", 3)
      .attr("fill", d => this.lookupColorByArtistName.get(d[0]))
      .merge(bars)
      .transition()
      .duration(800)
      .attr("y", d => y(d[0]))
      .attr("height", y.bandwidth())
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
      .style("font-family", "var(--sans)")
      .style("font-size", "12px")
      .style("font-weight", "600")

    labelEnter.merge(labelsSel)
      .transition()
      .duration(800)
      .attr("y", d => y(d[0]) + y.bandwidth() / 2)
      .attr("x", d => x(d[1].count) - 5)
      .each((d, i, nodes) => {
        let label = `${d[0]}`
        if (label.length > 40) {
          label = label.substring(0, 40) + "..."
        }
        const textEl = d3.select(nodes[i])
        textEl.selectAll("tspan").remove()

        const lines = this.wrapLabel(label, MAX_CHARS_PER_LINE)
        lines[lines.length - 1] += `: ${d[1].count}`

        const barWidth = x(d[1].count)
        const temp = textEl.append("tspan").text(label)
        const textWidth = nodes[i].getComputedTextLength()
        temp.remove()

        const isTooWide = textWidth + 50 > barWidth

        textEl
          .attr("text-anchor", isTooWide ? "start" : "end")
          .attr("x", isTooWide ? barWidth + 5 : barWidth - 5)

        lines.forEach((line, j) => {
          textEl.append("tspan")
            .text(line)
            .attr("x", isTooWide ? barWidth + 5 : barWidth - 5)
            .attr("dy", j === 0 ? 0 : "1.1em")
            .attr("text-anchor", isTooWide ? "start" : "end")
            .attr("fill", isTooWide ? token("--ink", "#F2EDDF") : "#07190A")
        })
      })

    labelsSel.exit().remove()
  }

  updateRaceType(event) {
    this.raceTypeValue = event.target.value
    this.frames = null
  }

  appendImage(imageGroup, imageUrl, yPos, name) {
    imageGroup.append("svg:image")
      .attr("xlink:href", imageUrl)
      .attr("x", -200)
      .attr("y", yPos + 40)
      .attr("width", 40)
      .attr("height", 40)
      .attr("clip-path", "circle(20px at 20px 20px)")
      .attr("data-name", name)
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

  showEmptyChart() {
    const svg = d3.select(this.svgTarget)
    svg.style("display", "block")
    svg.style("margin-left", "0")
    svg.style("margin-right", "auto")
    svg.selectAll("*").remove()

    const { width, height, chartWidth, chartHeight } = this.getChartDimensions()
    const bg2 = token("--bg-2", "#15130F")
    const line = token("--line", "#2A2620")

    svg.attr("width", width).attr("height", height)

    const g = svg.append("g").attr("transform", `translate(-150,40)`)

    g.append("rect")
      .attr("class", "background")
      .attr("x", 0).attr("y", 0)
      .attr("width", chartWidth).attr("height", chartHeight)
      .attr("fill", bg2)

    const sectionWidth = chartWidth / 5
    for (let i = 1; i < 5; i++) {
      g.append("line")
        .attr("class", "divider")
        .attr("x1", i * sectionWidth).attr("y1", 0)
        .attr("x2", i * sectionWidth).attr("y2", chartHeight)
        .attr("stroke", line)
        .attr("stroke-width", 1)
    }

    const y = d3.scaleBand()
      .range([0, chartHeight])
      .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
      .padding(0.18)

    const imageGroup = svg.append("g").attr("id", "barChartImages")
    const defaultImage = "/assets/DefaultArtistPfp.png"

    for (let i = 0; i < 10; i++) {
      const yPos = y(i)
      imageGroup.append("svg:image")
        .attr("xlink:href", defaultImage)
        .attr("x", -200)
        .attr("y", yPos + 40)
        .attr("width", 40)
        .attr("height", 40)
        .attr("clip-path", "circle(20px at 20px 20px)")
    }

    svg.append("text")
      .attr("x", (width / 2) - 240)
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .style("font-family", "var(--sans)")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("fill", token("--ink-mute", "#847C6B"))
      .text(`Press Start Race to animate Top 10 ${this.raceTypeValue} for ${this.selectedYearValue}`)
  }
}
