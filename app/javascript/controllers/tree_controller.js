import { Controller } from "@hotwired/stimulus"

// Resolves a CSS custom property defined on :root, with a fallback.
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

  connect() {
    this.currentIndex = 0
    this.itemsPerPage = 7
    this.navigationStack = []
    this.loadTreeData()
  }

  async loadTreeData() {
    try {
      const response = await fetch(
        `/imports/${this.importIdValue}/summary/tree_data?year=${this.selectedYearValue}`
      )
      this.treeData = await response.json()
      this.currentNode = this.treeData
      this.renderTree()
    } catch (error) {
      console.error("Error loading tree data:", error)
    }
  }

  drillDown(nodeData) {
    this.navigationStack.push(this.currentNode)
    this.currentNode = nodeData
    this.currentIndex = 0
    this.renderTree()
  }

  goBack() {
    if (this.navigationStack.length > 0) {
      this.currentNode = this.navigationStack.pop()
      this.currentIndex = 0
      this.renderTree()
    }
  }

  nextPage() {
    const maxIndex = this.currentNode.children.length - this.itemsPerPage
    if (this.currentIndex < maxIndex) {
      this.currentIndex++
      this.renderTree()
    }
  }

  prevPage() {
    if (this.currentIndex > 0) {
      this.currentIndex--
      this.renderTree()
    }
  }

  styleNavButton(btn, disabled = false) {
    btn.style.backgroundColor = "transparent"
    btn.style.color = token("--ink-soft", "#C9C0AB")
    btn.style.border = `1px solid ${token("--line", "#2A2620")}`
    btn.style.borderRadius = "100px"
    btn.style.cursor = "pointer"
    btn.style.fontFamily = "var(--sans)"
    btn.style.fontSize = "13px"
    btn.style.fontWeight = "500"
    btn.style.padding = "6px 14px"
    btn.style.transition = "all 120ms"
    btn.style.opacity = disabled ? "0.35" : "1"
  }

  renderTree() {
    const container = document.getElementById("tree-container")
    container.innerHTML = ""

    const accent = token("--accent", "#66D46E")
    const ink = token("--ink", "#F2EDDF")
    const inkSoft = token("--ink-soft", "#C9C0AB")
    const line = token("--line", "#2A2620")
    const lineSoft = token("--line-soft", "#1F1C17")

    // Back button (only when drilled in)
    if (this.navigationStack.length > 0) {
      const backDiv = document.createElement("div")
      backDiv.style.display = "flex"
      backDiv.style.justifyContent = "flex-start"
      backDiv.style.marginBottom = "16px"

      const backButton = document.createElement("button")
      backButton.textContent = "← Back"
      this.styleNavButton(backButton, false)
      backButton.addEventListener("click", () => this.goBack())
      backDiv.appendChild(backButton)
      container.appendChild(backDiv)
    }

    const treeWrapper = document.createElement("div")
    treeWrapper.style.display = "flex"
    treeWrapper.style.alignItems = "center"
    treeWrapper.style.justifyContent = "center"
    treeWrapper.style.gap = "12px"

    const maxIndex = this.currentNode.children.length - this.itemsPerPage

    const prevButton = document.createElement("button")
    prevButton.textContent = "◀"
    this.styleNavButton(prevButton, this.currentIndex === 0)
    prevButton.disabled = this.currentIndex === 0
    prevButton.addEventListener("click", () => this.prevPage())

    const treeDiv = document.createElement("div")
    treeDiv.id = "tree-svg-container"
    treeDiv.style.flex = "1"

    const nextButton = document.createElement("button")
    nextButton.textContent = "▶"
    this.styleNavButton(nextButton, this.currentIndex >= maxIndex)
    nextButton.disabled = this.currentIndex >= maxIndex
    nextButton.addEventListener("click", () => this.nextPage())

    treeWrapper.appendChild(prevButton)
    treeWrapper.appendChild(treeDiv)
    treeWrapper.appendChild(nextButton)
    container.appendChild(treeWrapper)

    const pageInfo = document.createElement("div")
    pageInfo.style.color = inkSoft
    pageInfo.style.textAlign = "center"
    pageInfo.style.marginTop = "16px"
    pageInfo.style.fontFamily = "var(--mono)"
    pageInfo.style.fontSize = "11px"
    pageInfo.style.letterSpacing = "0.04em"
    container.appendChild(pageInfo)

    // Page slice (immediate children only)
    const startIdx = this.currentIndex
    const endIdx = startIdx + this.itemsPerPage
    const pageChildren = this.currentNode.children.slice(startIdx, endIdx).map(child => ({
      name: child.name,
      value: child.value,
      children: [],
      _originalData: child
    }))

    const pageData = {
      name: this.currentNode.name,
      value: this.currentNode.value,
      children: pageChildren
    }

    const margin = { top: 50, right: 0, bottom: 50, left: 0 }
    const totalWidth = 1020
    const totalHeight = 300
    const width = totalWidth - margin.left - margin.right
    const height = totalHeight - margin.top - margin.bottom

    const svg = d3.select("#tree-svg-container")
      .append("svg")
      .attr("width", totalWidth)
      .attr("height", totalHeight)
      .style("background-color", "transparent")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const treeLayout = d3.tree().size([width, height])
    const root = d3.hierarchy(pageData)
    treeLayout(root)

    svg.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y))
      .attr("fill", "none")
      .attr("stroke", line)
      .attr("stroke-width", 1)

    const maxChildValue = d3.max(this.currentNode.children || [], d => d.value) || 1

    const nodes = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", d => d.depth === 1 && d.data._originalData?.children?.length > 0 ? "pointer" : "default")
      .on("click", (event, d) => {
        if (d.depth === 1 && d.data._originalData?.children?.length > 0) {
          this.drillDown(d.data._originalData)
        }
      })

    const barWidth = 60
    const barHeight = 16

    // Background bar (track)
    nodes.append("rect")
      .attr("x", -barWidth / 2)
      .attr("y", -barHeight / 2)
      .attr("width", barWidth)
      .attr("height", barHeight)
      .attr("fill", lineSoft)
      .attr("rx", 2)

    // Filled bar (accent)
    nodes.append("rect")
      .attr("x", -barWidth / 2)
      .attr("y", -barHeight / 2)
      .attr("width", d => {
        if (d.depth === 0) return barWidth
        return (d.data.value / maxChildValue) * barWidth
      })
      .attr("height", barHeight)
      .attr("fill", accent)
      .attr("rx", 2)

    // Labels
    nodes.append("text")
      .attr("dy", -12)
      .attr("text-anchor", "middle")
      .style("fill", ink)
      .style("font-family", "var(--sans)")
      .style("font-size", "11px")
      .style("font-weight", d => d.depth === 0 ? "600" : "500")
      .text(d => {
        const name = d.data.name.length > 25 ? d.data.name.substring(0, 25) + "..." : d.data.name
        return `${name}: ${d.data.value}`
      })
  }
}
