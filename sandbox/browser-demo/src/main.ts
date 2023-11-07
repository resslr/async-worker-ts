import "./style.css"
import useWorker, { reportProgress } from "async-worker-ts"

const worker = useWorker({
  calculatePi: (iterations: number) => {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)

      if (i % (iterations / 100) === 0) reportProgress(i / iterations)
    }
    return pi * 4
  },
})

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <button id="btn" type="button">New Task</button>
    <button id="cancel-btn" type="button">Stop Worker</button>
    <h4 id="total-iterations">Total Iterations: 0</h4>
    <ul style="list-style-type:none;margin:0;padding:0" id="progress-bars"></ul>
`
const btn = document.getElementById("btn")!
const progressBars = document.getElementById("progress-bars")!
const totalIterationsEl = document.getElementById("total-iterations")!
const cancelButton = document.getElementById("cancel-btn")!

let totalIterations = 0
const iterationsPerTask = 250_000_000

btn.addEventListener("click", () => {
  const progressBar = Object.assign(document.createElement("progress"), {
    value: 0,
    max: 1,
  })

  const li = document.createElement("li")
  li.appendChild(progressBar)
  progressBars.appendChild(li)

  worker
    .calculatePi(iterationsPerTask)
    .onProgress((n) => {
      progressBar.value = n
      totalIterations += iterationsPerTask / 100
      totalIterationsEl.innerHTML = `Total Iterations: ${totalIterations.toLocaleString()}`
    })
    .then(() => (progressBar.value = 1))

  cancelButton.addEventListener("click", () => worker.exit())
})
