
const display = document.getElementById("display");
const buttons = document.querySelector(".buttons");

let expression = "";
let finished = false;

function updateDisplay() {
  display.value = expression || "0";
}

function appendValue(value) {
  if (finished) {
    expression = "";
    finished = false;
  }

  if (/[0-9]/.test(value) && expression === "0") {
    expression = value;
  } else {
    expression += value;
  }

  updateDisplay();
}

function clearDisplay() {
  expression = "";
  finished = false;
  updateDisplay();
}

function deleteLast() {
  expression = expression.slice(0, -1);
  finished = false;
  updateDisplay();
}

function calculate() {
  if (!expression) return;

  try {
    // Accept only calculator characters.
    if (!/^[0-9+\-*/%.()\s]+$/.test(expression)) {
      throw new Error("Invalid input");
    }

    // Handle percentages as a fraction.
    const safeExpression = expression.replace(
      /(\d+\.?\d*)%/g,
      "($1/100)"
    );

    const result = Function(
      '"use strict"; return (' + safeExpression + ')'
    )();

    if (!Number.isFinite(result)) {
      throw new Error("Invalid result");
    }

    expression = String(
      Number(result.toPrecision(12))
    );
    finished = true;
    updateDisplay();
  } catch {
    display.value = "Error";
    expression = "";
    finished = true;
  }
}

buttons.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const value = button.dataset.value;

  if (action === "clear") clearDisplay();
  else if (action === "delete") deleteLast();
  else if (action === "calculate") calculate();
  else if (value !== undefined) appendValue(value);
});

// Keyboard support
document.addEventListener("keydown", (event) => {
  const key = event.key;

  if (/^[0-9.+\-*/%()]$/.test(key)) {
    appendValue(key);
  } else if (key === "Enter" || key === "=") {
    event.preventDefault();
    calculate();
  } else if (key === "Backspace") {
    deleteLast();
  } else if (key === "Escape") {
    clearDisplay();
  }
});

updateDisplay();
