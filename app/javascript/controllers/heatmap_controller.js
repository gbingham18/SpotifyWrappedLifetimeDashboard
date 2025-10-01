import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    importId: Number,
    initialYear: Number
  }

  connect() {
    this.artistList = JSON.parse(document.getElementById("artist-data")?.textContent || "[]")
    this.trackList = JSON.parse(document.getElementById("track-data")?.textContent || "[]")

    this.setupSearchAutocomplete()
    this.setupEvents()
  }

  setupEvents() {
    const searchInput = document.getElementById("entitySearch")
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        this.loadHeatmap()
      }
    })

    document.getElementById("entityType").addEventListener("change", () => {
      document.getElementById("entitySearch").value = ""
    })

    document.getElementById("heatmapYear").addEventListener("change", () => {
      const name = document.getElementById("entitySearch").value.trim()
      if (name) {
        this.loadHeatmap()
      }
    })
  }

  setupSearchAutocomplete() {
    const input = document.getElementById("entitySearch")
    input.addEventListener("input", () => {
      const query = input.value.trim()
      const type = document.getElementById("entityType").value

      if (query.length < 2) {
        document.querySelectorAll(".autocomplete-item").forEach(el => el.remove())
        return
      }

      const url = `/imports/${this.importIdValue}/search/entity_names?type=${type}&q=${encodeURIComponent(query)}`

      fetch(url)
        .then(res => res.json())
        .then(results => this.showAutocompleteSuggestions(input, results))
    })
  }


  showAutocompleteSuggestions(input, suggestions) {
    // Clear old dropdown
    document.querySelectorAll(".autocomplete-item").forEach(el => el.remove())

    // Ensure parent has position relative for absolute positioning to work
    const parent = input.parentNode
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative'
    }

    suggestions.forEach((name, index) => {
      const div = document.createElement("div")
      div.textContent = name
      div.className = "autocomplete-item"
      const topPosition = input.offsetTop + input.offsetHeight + (index * 30)
      const leftPosition = input.offsetLeft
      div.style.cssText = `position: absolute; top: ${topPosition}px; left: ${leftPosition}px; background: white; border: 1px solid #ccc; z-index: 1000; cursor: pointer; padding: 4px; width: 250px;`

      div.addEventListener("click", () => {
        input.value = name
        this.loadHeatmap()
        document.querySelectorAll(".autocomplete-item").forEach(el => el.remove())
      })

      parent.appendChild(div)
    })
  }

  loadHeatmap() {
    const type = document.getElementById("entityType").value
    const name = document.getElementById("entitySearch").value.trim()
    const year = document.getElementById("heatmapYear").value

    if (!name) return

    const url = `/imports/${this.importIdValue}/summary/heatmap_data?type=${type}&name=${encodeURIComponent(name)}&year=${year}`

    fetch(url)
      .then(res => res.json())
      .then(data => this.renderHeatmap(data))
      .catch(err => console.error("Heatmap fetch error", err))
  }

  renderHeatmap(data) {
    const container = document.getElementById("heatmap-grid")
    container.innerHTML = ""

    const year = document.getElementById("heatmapYear").value
    const start = new Date(`${year}-01-01`)
    const end = new Date(`${year}-12-31`)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]
      const count = data[dateStr] || 0
      const level = this.intensityLevel(count)

      const cell = document.createElement("div")
      cell.className = `heatmap-cell level-${level}`
      cell.title = `${dateStr}: ${count} plays`
      container.appendChild(cell)
    }
  }

  intensityLevel(count) {
    if (count === 0) return 0
    if (count <= 2) return 1
    if (count <= 5) return 2
    if (count <= 10) return 3
    return 4
  }
}
