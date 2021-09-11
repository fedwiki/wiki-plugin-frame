window.addEventListener('DOMContentLoaded', (event) => {
  const guess = () => Math.floor(6 * Math.random())
  function postMessage(message) {
    window.parent.postMessage(message, "*")
  }
  var sourceData = window.sourceData = {
    Code: guess(),
    Tests: guess(),
    Monitoring: guess(),
    Security: guess(),
    Availability: guess()
  }
  postMessage({
    action: "publishSourceData", name: "radar", sourceData
  })
  let table = document.createElement("table")
  for(let [name, value] of Object.entries(sourceData)) {
    let row = document.querySelector("#row")
        .content.cloneNode(true)
    row.querySelector("th").textContent = name
    row.querySelector("td").textContent = value
    table.appendChild(row)
  }
  table.addEventListener("mouseover", event => {
    let tr = event.target.closest("tr")
    if (!tr)
      return
    let thumb = tr.querySelector("th").textContent
    postMessage({action: "triggerThumb", thumb})
  })
  let status = document.querySelector("#status")
  let now = new Date().toLocaleString()
  status.innerHTML = `<p>published ${now}</p>`
  status.appendChild(table)
  let height = document.body.offsetHeight
  postMessage({action:"resize", height})
})
