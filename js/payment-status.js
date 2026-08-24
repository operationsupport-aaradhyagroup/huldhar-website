(function () {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId");
  const icon = document.getElementById("status-icon");
  const title = document.getElementById("status-title");
  const message = document.getElementById("status-message");
  const reference = document.getElementById("order-ref");
  const retry = document.getElementById("retry-status");

  reference.textContent = orderId ? `Order reference: ${orderId}` : "Order reference unavailable";

  function render(state) {
    const normalized = String(state || "PENDING").toUpperCase();
    icon.className = "status-icon";
    if (normalized === "COMPLETED") {
      icon.classList.add("success"); icon.textContent = "✓";
      title.textContent = "Payment successful";
      message.textContent = "Thank you. Your order payment has been confirmed.";
      retry.hidden = true;
    } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(normalized)) {
      icon.classList.add("failed"); icon.textContent = "×";
      title.textContent = "Payment not completed";
      message.textContent = "No confirmed payment was received. You can return to Products and try again.";
      retry.hidden = true;
    } else {
      icon.textContent = "…";
      title.textContent = "Payment pending";
      message.textContent = "PhonePe has not confirmed the payment yet. Please wait a moment and check again.";
      retry.hidden = false;
    }
  }

  async function checkStatus() {
    if (!orderId) { render("FAILED"); return; }
    retry.disabled = true;
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(orderId)}/status`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      render(result.state);
    } catch (_error) {
      render("PENDING");
      message.textContent = "We could not verify the payment right now. Please check again shortly.";
    } finally {
      retry.disabled = false;
    }
  }

  retry.addEventListener("click", checkStatus);
  checkStatus();
})();
