/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Keep track of selected products */
let selectedProducts = [];

/* Load selected products from localStorage when page loads */
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
    } catch {
      selectedProducts = [];
    }
  }
}

/* Save selected products to localStorage */
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Show selected products above the button, with remove and clear options */
function displaySelectedProducts() {
  const selectedContainer = document.getElementById("selectedProductsList");

  if (selectedProducts.length === 0) {
    selectedContainer.innerHTML = "<p>No products selected.</p>";
  } else {
    selectedContainer.innerHTML = `
      <ul style="list-style:none; padding:0;">
        ${selectedProducts
          .map(
            (p, i) => `
            <li style="display:inline-block; margin-right:10px;">
              ${p.name}
              <button data-index="${i}" class="remove-product" style="margin-left:4px;">✕</button>
            </li>
          `
          )
          .join("")}
      </ul>
      <button id="clearSelected" style="margin-top:10px;">Clear All</button>
    `;
    // Add event listeners for remove buttons
    document.querySelectorAll(".remove-product").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(btn.getAttribute("data-index"));
        selectedProducts.splice(idx, 1);
        saveSelectedProducts();
        displaySelectedProducts();
      });
    });
    // Add event listener for clear button
    document.getElementById("clearSelected").addEventListener("click", () => {
      selectedProducts = [];
      saveSelectedProducts();
      displaySelectedProducts();
      // Do NOT reload or display all products here!
      // The product grid will update selection visuals automatically.
    });
  }
}

/* Update displayProducts to save selection changes */
function displayProducts(products) {
  // Create product cards with a details button and hidden description
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div 
      class="product-card${
        selectedProducts.some((p) => p.name === product.name) ? " selected" : ""
      }" 
      data-name="${product.name}"
    >
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="details-btn" style="margin-top:8px;">Details</button>
        <div class="product-description" style="display:none; margin-top:8px;">
          ${product.description}
        </div>
      </div>
    </div>
  `
    )
    .join("");

  // Add click event listeners to each product card for selection
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      // Prevent selection if details button is clicked
      if (e.target.classList.contains("details-btn")) return;

      const name = card.getAttribute("data-name");
      const product = products.find((p) => p.name === name);

      const index = selectedProducts.findIndex((p) => p.name === name);
      if (index === -1) {
        selectedProducts.push(product);
      } else {
        selectedProducts.splice(index, 1);
      }
      saveSelectedProducts();
      displayProducts(products);
      displaySelectedProducts();
    });
  });

  // Add click event listeners for details buttons to toggle description
  document.querySelectorAll(".details-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card selection
      const desc = btn.nextElementSibling;
      if (desc.style.display === "none") {
        desc.style.display = "block";
        btn.textContent = "Hide Details";
      } else {
        desc.style.display = "none";
        btn.textContent = "Details";
      }
    });
  });

  displaySelectedProducts();
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

// Replace this URL with your Cloudflare Worker endpoint
const WORKER_API_URL = "https://your-worker-url.workers.dev";

/* Chat form submission handler - sends selected products to OpenAI API via Worker */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Show loading message while waiting for response
  chatWindow.innerHTML = "<p>Generating your routine...</p>";

  // Prepare messages for OpenAI API
  const messages = [
    {
      role: "system",
      content:
        "You are a skincare expert. Create a personalized skincare routine using the selected products.",
    },
    {
      role: "user",
      content: `Here are the selected products: ${selectedProducts
        .map((p) => p.name)
        .join(", ")}. Please create a routine.`,
    },
  ];

  try {
    // Send request to Cloudflare Worker using fetch and async/await
    const response = await fetch(WORKER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 300,
      }),
    });

    const data = await response.json();

    // Check if response contains the routine
    if (
      data.choices &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      chatWindow.innerHTML = `<p>${data.choices[0].message.content}</p>`;
    } else {
      chatWindow.innerHTML =
        "<p>Sorry, something went wrong. Please try again.</p>";
    }
  } catch (error) {
    // Show error message if request fails
    chatWindow.innerHTML = "<p>Error connecting to the API.</p>";
  }
});

// Get reference to the Generate Routine button
const generateRoutineBtn = document.getElementById("generateRoutine");

// Add click event listener to Generate Routine button
generateRoutineBtn.addEventListener("click", async () => {
  // Show loading message while waiting for response
  chatWindow.innerHTML = "<p>Generating your routine...</p>";

  // Prepare messages for OpenAI API
  const messages = [
    {
      role: "system",
      content:
        "You are a skincare expert. Create a personalized skincare routine using the selected products.",
    },
    {
      role: "user",
      content: `Here are the selected products: ${selectedProducts
        .map((p) => p.name)
        .join(", ")}. Please create a routine.`,
    },
  ];

  try {
    // Send request to OpenAI API using fetch and async/await
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Replace with your actual API key before using
        Authorization: "Bearer YOUR_API_KEY",
      },
      body: JSON.stringify({
        model: "gpt-4o", // Use gpt-4o model
        messages: messages,
        max_tokens: 300,
      }),
    });

    const data = await response.json();

    // Check if response contains the routine
    if (
      data.choices &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      chatWindow.innerHTML = `<p>${data.choices[0].message.content}</p>`;
    } else {
      chatWindow.innerHTML =
        "<p>Sorry, something went wrong. Please try again.</p>";
    }
  } catch (error) {
    // Show error message if request fails
    chatWindow.innerHTML = "<p>Error connecting to OpenAI API.</p>";
  }
});

// Load selected products on page load
loadSelectedProducts();
displaySelectedProducts();
