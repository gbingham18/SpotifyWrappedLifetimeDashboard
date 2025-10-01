const barColors = [
  '#FF4C4C', '#4FC3F7', '#FFD700', '#A080FF', '#FF914D',
  '#A6FF4D', '#4DFFDF', '#FF66B2', '#F0F0F0', '#3FA9F5'
];

const lookupColorByArtistName = new Map();
const usedColors = new Set();

const imageCache = new Map();

document.addEventListener("DOMContentLoaded", () => {
const importId = document.body.dataset.importId;
const selectedYear = document.body.dataset.selectedYear;
const raceTypeSelect = document.getElementById("raceType");

  document.body.dataset.raceType = raceTypeSelect.value;

  raceTypeSelect.addEventListener("change", function () {
    document.body.dataset.raceType = this.value;
  });

    document.getElementById("startChart").addEventListener("click", () => {
        const raceType = document.body.dataset.raceType;
        fetch(`/imports/${importId}/summary/bar_chart_race?year=${selectedYear}&type=${raceType}`)
        .then(res => res.json())
        .then(data => {
            console.log(data)
            const svg = d3.select("#barChart");
            svg.style("display", "block");
            svg.selectAll("*").remove();
            const container = document.getElementById("barChart");
            const width = container.clientWidth;
            const height = container.clientHeight || 600;
            const margin = { top: 40, right: 80, bottom: 120, left: 150 };
            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;

            const g = svg.append("g")
            .attr("transform", `translate(80,40)`);

            const x = d3.scaleLinear().range([0, chartWidth]);
            const y = d3.scaleBand().range([0, chartHeight]).padding(0.1);

            const title = svg.append("text")
            .attr("x", width / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .style("font-size", "20px");
            const dates = Object.keys(data).sort();
            const dataByDate = dates.map(date => data[date]);
            const cumulativeData = {};

            const getTop10Cumulative = (index) => {
                for (let i = 0; i <= index; i++) {
                    const dayData = dataByDate[i];
                    for (const [name, info] of Object.entries(dayData)) {
                        const count = info || 0;
                        const image_url = null;

                        if (!cumulativeData[name]) {
                            cumulativeData[name] = { count: 0 };
                        }

                        cumulativeData[name].count += count;
                    }
                }
                return Object.entries(cumulativeData)
                    .map(([name, info]) => [name, info])
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 10);
            };

            function update(index) {
                const top10 = getTop10Cumulative(index);
                const labels = top10.map(d => d[0]);
                const values = top10.map(d => d[1].count);

                for (let [artist, color] of lookupColorByArtistName.entries()) {
                    if (!labels.includes(artist)) {
                        lookupColorByArtistName.delete(artist);
                        usedColors.delete(color);
                    }
                }

                labels.forEach(label => {
                    if (!lookupColorByArtistName.has(label)) {
                        const availableColor = barColors.find(c => !usedColors.has(c));
                        lookupColorByArtistName.set(label, availableColor || "#999999");
                        usedColors.add(availableColor);
                    }
                });

                d3.select("#barChartImages").remove();

                const imageGroup = svg.append("g").attr("id", "barChartImages");
                y.domain(labels);

                top10.forEach(([name, info]) => {
                    const yPos = y(name);

                    if (yPos === undefined) return;

                    if (imageCache.has(name)) {
                        const imageUrl = imageCache.get(name);
                        if (imageUrl) {
                            appendImage(imageGroup, imageUrl, yPos);
                        }
                    } else {
                        const endpoint = raceType === "Artists" ? "/spotify/artist_image" : "/spotify/track_image";
                        fetch(`${endpoint}?name=${encodeURIComponent(name)}`)
                            .then(res => res.json())
                            .then(data => {
                                const imageUrl = data.thumbnail_url;
                                imageCache.set(name, imageUrl || null);
                                if (imageUrl) {
                                    appendImage(imageGroup, imageUrl, y(name)); // recalculate y(name) in case it's changed
                                }
                            })
                            .catch(err => {
                                console.error("Error loading image for", name, err);
                                imageCache.set(name, null);
                            });
                    }
                });

                x.domain([0, d3.max(values)]);
                y.domain(labels);

                title.text(`Top 10 ${raceType} (Cumulative) – ${dates[index]}`);

                const bars = g.selectAll("rect").data(top10, d => d[0]);

                bars.enter()
                    .append("rect")
                    .attr("y", d => y(d[0]))
                    .attr("height", y.bandwidth())
                    .attr("x", 0)
                    .attr("width", d => x(d[1].count))
                    .attr("fill", d => lookupColorByArtistName.get(d[0]))
                    .merge(bars)
                    .transition()
                    .duration(800)
                    .attr("y", d => y(d[0]))
                    .attr("width", d => x(d[1].count));

                bars.exit().remove();

                const MAX_CHARS_PER_LINE = 30;
                const labelsSel = g.selectAll(".label").data(top10, d => d[0]);

                const labelEnter = labelsSel.enter()
                    .append("text")
                    .attr("class", "label")
                    .attr("y", d => y(d[0]) + y.bandwidth() / 2)
                    .attr("dy", ".35em");

                labelEnter.merge(labelsSel)
                    .transition()
                    .duration(800)
                    .attr("y", d => y(d[0]) + y.bandwidth() / 2)
                    .attr("x", d => {
                        const barWidth = x(d[1].count);
                        return barWidth - 5;
                    })
                    .each(function (d) {
                        const label = `${d[0]}`;
                        const textEl = d3.select(this);
                        textEl.selectAll("tspan").remove();

                        const lines = wrapLabel(label, MAX_CHARS_PER_LINE);
                        lines[lines.length - 1] += ` (${d[1].count})`;

                        const barWidth = x(d[1].count);
                        const temp = textEl.append("tspan").text(label);
                        const textWidth = this.getComputedTextLength();
                        temp.remove();

                        const isTooWide = textWidth + 50 > barWidth;

                        textEl
                            .attr("text-anchor", isTooWide ? "start" : "end")
                            .attr("x", isTooWide ? barWidth + 5 : barWidth - 5)
                            .attr("fill", isTooWide ? "black" : "white");

                        lines.forEach((line, i) => {
                            textEl.append("tspan")
                                .text(line)
                                .attr("x", isTooWide ? barWidth + 5 : barWidth - 5)
                                .attr("dy", i === 0 ? 0 : "1.1em")
                                .attr("text-anchor", isTooWide ? "start" : "end");
                        });
                    });

                labelsSel.exit().remove();
            }

            let dataIndex = 0;
            function step() {
                if (dataIndex >= dates.length) return;
                update(dataIndex);
                dataIndex++;
                setTimeout(step, 1000);
            }
            step();
        });
    });
});

function wrapLabel(text, maxChars) {
    const words = text.split(" ");
    const lines = [];
    let line = "";

    words.forEach(word => {
        if ((line + word).length <= maxChars) {
            line += word + " ";
        } else {
            lines.push(line.trim());
            line = word + " ";
        }
    });

    if (line) lines.push(line.trim());
    return lines;
}

function appendImage(imageGroup, imageUrl, yPos) {
    imageGroup.append("svg:image")
        .attr("xlink:href", imageUrl)
        .attr("x", 30)
        .attr("y", yPos + 40)
        .attr("width", 40)
        .attr("height", 40)
        .attr("clip-path", "circle(20px at 20px 20px)");
}

