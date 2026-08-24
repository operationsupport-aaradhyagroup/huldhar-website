(function () {
  const buyButton = document.getElementById("buy-paddy");
  if (!buyButton) return;

  buyButton.addEventListener("click", async function () {
    const originalText = buyButton.textContent;
    buyButton.disabled = true;
    buyButton.textContent = "Opening PhonePe…";

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "paddy-seeds-1kg" })
      });
      const result = await response.json();
      if (!response.ok || !result.redirectUrl) throw new Error(result.message || "Payment could not be started.");
      window.location.assign(result.redirectUrl);
    } catch (error) {
      alert(error.message || "Payment could not be started. Please try again.");
      buyButton.disabled = false;
      buyButton.textContent = originalText;
    }
  });
})();
