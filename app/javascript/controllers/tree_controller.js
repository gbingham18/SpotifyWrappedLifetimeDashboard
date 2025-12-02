import { Controller } from "@hotwired/stimulus"

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

  renderTree() {
    const container = document.getElementById("tree-container")
    container.innerHTML = ""

    // Create back button (only show if we're drilled down)
    if (this.navigationStack.length > 0) {
      const backDiv = document.createElement("div")
      backDiv.style.display = "flex"
      backDiv.style.justifyContent = "center"
      backDiv.style.marginBottom = "20px"

      const backButton = document.createElement("button")
      backButton.textContent = "⬆ Back"
      backButton.style.backgroundColor = "#1ed760"
      backButton.style.color = "white"
      backButton.style.border = "none"
      backButton.style.borderRadius = "5px"
      backButton.style.cursor = "pointer"
      backButton.addEventListener("click", () => this.goBack())
      backDiv.appendChild(backButton)
      container.appendChild(backDiv)
    }

    // Create container for tree with side navigation
    const treeWrapper = document.createElement("div")
    treeWrapper.style.display = "flex"
    treeWrapper.style.alignItems = "center"
    treeWrapper.style.justifyContent = "center"
    treeWrapper.style.gap = "0px"

    const maxIndex = this.currentNode.children.length - this.itemsPerPage

    // Left chevron
    const prevButton = document.createElement("button")
    prevButton.textContent = "◀"
    prevButton.style.backgroundColor = "#1ed760"
    prevButton.style.color = "white"
    prevButton.style.border = "none"
    prevButton.style.borderRadius = "5px"
    prevButton.style.cursor = "pointer"
    prevButton.style.fontSize = "20px"
    prevButton.disabled = this.currentIndex === 0
    if (prevButton.disabled) {
      prevButton.style.opacity = "0.3"
    }
    prevButton.addEventListener("click", () => this.prevPage())

    // Tree container div
    const treeDiv = document.createElement("div")
    treeDiv.id = "tree-svg-container"
    treeDiv.style.flex = "1"

    // Right chevron
    const nextButton = document.createElement("button")
    nextButton.textContent = "▶"
    nextButton.style.backgroundColor = "#1ed760"
    nextButton.style.color = "white"
    nextButton.style.border = "none"
    nextButton.style.borderRadius = "5px"
    nextButton.style.cursor = "pointer"
    nextButton.style.fontSize = "20px"
    nextButton.disabled = this.currentIndex >= maxIndex
    if (nextButton.disabled) {
      nextButton.style.opacity = "0.3"
    }
    nextButton.addEventListener("click", () => this.nextPage())

    treeWrapper.appendChild(prevButton)
    treeWrapper.appendChild(treeDiv)
    treeWrapper.appendChild(nextButton)
    container.appendChild(treeWrapper)

    // Page info below tree
    const pageInfo = document.createElement("div")
    pageInfo.style.color = "#E0E0E0"
    pageInfo.style.textAlign = "center"
    pageInfo.style.marginTop = "20px"
    container.appendChild(pageInfo)

    // Get current page of children (only show immediate children, not grandchildren)
    const startIdx = this.currentIndex
    const endIdx = startIdx + this.itemsPerPage
    const pageChildren = this.currentNode.children.slice(startIdx, endIdx).map(child => ({
      name: child.name,
      value: child.value,
      children: [], // Don't show grandchildren
      _originalData: child // Store original data for drill-down
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

    const treeLayout = d3.tree()
      .size([width, height])

    const root = d3.hierarchy(pageData)
    treeLayout(root)

    // Draw links (lines connecting nodes)
    svg.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y))
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-width", 2)

    // Calculate max value among ALL children (not just current page) for proportional sizing
    const maxChildValue = d3.max(this.currentNode.children || [], d => d.value) || 1

    // Draw nodes
    const nodes = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", d => d.depth === 1 && d.data._originalData?.children?.length > 0 ? "pointer" : "default")
      .on("click", (event, d) => {
        // Only allow drilling down on level 1 nodes (artists) that have children
        if (d.depth === 1 && d.data._originalData?.children?.length > 0) {
          this.drillDown(d.data._originalData)
        }
      })

    // Add bars for nodes
    const barWidth = 60
    const barHeight = 20

    // Add background bar (unfilled portion)
    nodes.append("rect")
      .attr("x", -barWidth / 2)
      .attr("y", -barHeight / 2)
      .attr("width", barWidth)
      .attr("height", barHeight)
      .attr("fill", "#2A2A2A")
      .attr("stroke-width", 2)
      .attr("rx", 3)

    // Add filled bar (proportional to value)
    nodes.append("rect")
      .attr("x", -barWidth / 2)
      .attr("y", -barHeight / 2)
      .attr("width", d => {
        if (d.depth === 0) return barWidth // Parent is 100% filled
        return (d.data.value / maxChildValue) * barWidth // Children proportional to max child
      })
      .attr("height", barHeight)
      .attr("fill", "#1ed760")
      .attr("rx", 3)

    // Add labels
    nodes.append("text")
      .attr("dy", -12)
      .attr("text-anchor", "middle")
      .style("fill", "#E0E0E0")
      .style("font-size", "11px")
      .style("font-weight", d => d.depth === 0 ? "bold" : "normal")
      .text(d => {
        const name = d.data.name.length > 25 ? d.data.name.substring(0, 25) + "..." : d.data.name
        return `${name}: ${d.data.value}`
      })
  }
}
