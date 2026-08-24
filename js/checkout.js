(function () {
  const buyButtons = document.querySelectorAll("[data-buy-product]");
  if (!buyButtons.length) return;

  buyButtons.forEach(function (buyButton) {
    buyButton.addEventListener("click", async function () {
      const originalText = buyButton.textContent;
      buyButton.disabled = true;
      buyButton.textContent = "Opening PhonePe…";

      try {
        const response = await fetch("/api/payments/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: buyButton.dataset.buyProduct })
        });
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("The payment service is temporarily unavailable. Please try again shortly.");
        }
        const result = await response.json();
        if (!response.ok || !result.redirectUrl) throw new Error(result.message || "Payment could not be started.");
        window.location.assign(result.redirectUrl);
      } catch (error) {
        alert(error.message || "Payment could not be started. Please try again.");
        buyButton.disabled = false;
        buyButton.textContent = originalText;
      }
    });
  });
})();
