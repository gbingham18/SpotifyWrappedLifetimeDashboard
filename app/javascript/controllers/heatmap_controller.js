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
    this.renderEmptyHeatmap()
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

    if (!name) return

    const url = `/imports/${this.importIdValue}/summary/heatmap_data?type=${type}&name=${encodeURIComponent(name)}&year=${this.initialYearValue}`

    fetch(url)
      .then(res => res.json())
      .then(data => this.renderHeatmap(data))
      .catch(err => console.error("Heatmap fetch error", err))
  }

  renderHeatmap(data) {
    const container = document.getElementById("heatmap-grid")
    container.innerHTML = ""

    const year = this.initialYearValue
    const startDate = new Date(`${year}-01-01`)
    const startDay = startDate.getDay() // 0 = Sunday, 6 = Saturday

    // Create month headers row
    const monthHeaderRow = document.createElement("div")
    monthHeaderRow.className = "heatmap-month-row"

    // Empty cell for day labels column
    const emptyCorner = document.createElement("div")
    emptyCorner.className = "heatmap-day-label"
    monthHeaderRow.appendChild(emptyCorner)

    // Add month headers (53 weeks)
    let currentMonth = -1
    for (let week = 0; week < 53; week++) {
      const weekDate = new Date(startDate)
      weekDate.setDate(startDate.getDate() + (week * 7))

      const monthHeader = document.createElement("div")
      monthHeader.className = "heatmap-month-label"

      // Only show month label if it's within the current year and different from last
      if (weekDate.getFullYear() === year) {
        const month = weekDate.getMonth()
        if (month !== currentMonth) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          monthHeader.textContent = monthNames[month]
          currentMonth = month
        }
      }

      monthHeaderRow.appendChild(monthHeader)
    }
    container.appendChild(monthHeaderRow)

    // Create 7 rows (days of week)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let day = 0; day < 7; day++) {
      const row = document.createElement("div")
      row.className = "heatmap-row"

      // Day label
      const dayLabel = document.createElement("div")
      dayLabel.className = "heatmap-day-label"
      dayLabel.textContent = dayNames[day]
      row.appendChild(dayLabel)

      // 53 week columns
      for (let week = 0; week < 53; week++) {
        const dayOffset = (week * 7) + day - startDay
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + dayOffset)

        const cell = document.createElement("div")

        // Only show data if it's a valid date in the year
        if (currentDate.getFullYear() === year) {
          const dateStr = currentDate.toISOString().split("T")[0]
          const count = data[dateStr] || 0
          const level = this.intensityLevel(count)

          cell.className = `heatmap-cell level-${level}`
          cell.title = `${dateStr}: ${count} plays`
          cell.dataset.date = dateStr
        } else {
          cell.className = "heatmap-cell level-0 empty-cell"
        }

        row.appendChild(cell)
      }

      container.appendChild(row)
    }
  }

  intensityLevel(count) {
    if (count === 0) return 0
    if (count <= 2) return 1
    if (count <= 5) return 2
    if (count <= 10) return 3
    return 4
  }

  renderEmptyHeatmap() {
    const container = document.getElementById("heatmap-grid")
    if (!container) return

    container.innerHTML = ""

    const year = this.initialYearValue
    const startDate = new Date(`${year}-01-01`)
    const startDay = startDate.getDay() // 0 = Sunday, 6 = Saturday

    // Create month headers row
    const monthHeaderRow = document.createElement("div")
    monthHeaderRow.className = "heatmap-month-row"

    // Empty cell for day labels column
    const emptyCorner = document.createElement("div")
    emptyCorner.className = "heatmap-day-label"
    monthHeaderRow.appendChild(emptyCorner)

    // Add month headers (53 weeks)
    let currentMonth = -1
    for (let week = 0; week < 53; week++) {
      const weekDate = new Date(startDate)
      weekDate.setDate(startDate.getDate() + (week * 7))

      const monthHeader = document.createElement("div")
      monthHeader.className = "heatmap-month-label"

      // Only show month label if it's within the current year and different from last
      if (weekDate.getFullYear() === year) {
        const month = weekDate.getMonth()
        if (month !== currentMonth) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          monthHeader.textContent = monthNames[month]
          currentMonth = month
        }
      }

      monthHeaderRow.appendChild(monthHeader)
    }
    container.appendChild(monthHeaderRow)

    // Create 7 rows (days of week)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let day = 0; day < 7; day++) {
      const row = document.createElement("div")
      row.className = "heatmap-row"

      // Day label
      const dayLabel = document.createElement("div")
      dayLabel.className = "heatmap-day-label"
      dayLabel.textContent = dayNames[day]
      row.appendChild(dayLabel)

      // 53 week columns
      for (let week = 0; week < 53; week++) {
        const dayOffset = (week * 7) + day - startDay
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + dayOffset)

        const cell = document.createElement("div")
        cell.className = "heatmap-cell level-0"

        // Only show tooltip if it's a valid date in the year
        if (currentDate.getFullYear() === year) {
          const dateStr = currentDate.toISOString().split("T")[0]
          cell.title = dateStr
          cell.dataset.date = dateStr
        } else {
          cell.classList.add("empty-cell")
        }

        row.appendChild(cell)
      }

      container.appendChild(row)
    }
  }
}
