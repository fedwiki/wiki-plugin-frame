window.addEventListener(
  'DOMContentLoaded', (event) => {
    const sourceData = window.sourceData = {
      Code: "5",
      Tests: "3",
      Monitoring: "0",
      Security: "3",
      Availability: "5"
    }
    window.parent.postMessage({
      action: "publishSourceData",
      name: "radar",
      sourceData
    }, '*')
    let table = document.createElement("table")
    for(let [name, value] of Object.entries(sourceData)) {
      let row = document.querySelector("#row")
          .content.cloneNode(true)
      row.querySelector("th").textContent = name
      row.querySelector("td").textContent = value
      table.appendChild(row)
    }
    table.addEventListener("mouseover", event => {
      let thumb = event.target.closest("tr")
          .querySelector("th").textContent
      window.parent.postMessage({
        action: "triggerThumb",
        thumb
      }, "*")
    })
    let status = document.querySelector("#status")
    let date = new Date().toLocaleString()
    status.innerHTML = `<p>published ${date}</p>`
    status.appendChild(table)
  }
)
