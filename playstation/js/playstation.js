const form = document.getElementById("psn-form");
    const input = document.getElementById("psn-input");
    const checkButton = document.getElementById("check-button");
    const srStatus = document.getElementById("sr-status");

    const resultCard = document.getElementById("result-card");
    const resultIcon = document.getElementById("result-icon");
    const resultTitle = document.getElementById("result-title");
    const resultMessage = document.getElementById("result-message");
    const resultBadge = document.getElementById("result-badge");

    const historySection = document.getElementById("history-section");
    const historyList = document.getElementById("history-list");

    // Store: { id, available }
    const recentChecks = [];

    function setLoading(isLoading) {
      if (isLoading) {
        checkButton.disabled = true;
        checkButton.textContent = "Checking...";
      } else {
        checkButton.disabled = false;
        checkButton.textContent = "Check";
      }
    }

    function updateHistory(psnId, available) {
      const cleanId = psnId.trim();
      if (!cleanId) return;

      const existingIndex = recentChecks.findIndex((item) => item.id.toLowerCase() === cleanId.toLowerCase());
      if (existingIndex !== -1) {
        recentChecks.splice(existingIndex, 1);
      }
      recentChecks.unshift({ id: cleanId, available });

      if (recentChecks.length > 6) {
        recentChecks.length = 6;
      }

      historyList.innerHTML = "";
      recentChecks.forEach(({ id, available }) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "history-pill " + (available ? "available" : "unavailable");
        pill.textContent = id;
        pill.addEventListener("click", () => {
          input.value = id;
          performCheck(id);
        });
        historyList.appendChild(pill);
      });

      historySection.classList.toggle("show", recentChecks.length > 0);
    }

    function showResult({ psnId, available, message }) {
      resultCard.classList.add("show");
      resultCard.classList.toggle("available", available);
      resultCard.classList.toggle("unavailable", !available);

      resultIcon.textContent = available ? "✓" : "✕";
      resultTitle.textContent = `"${psnId}" is ${available ? "available" : "taken"}`;
      resultMessage.textContent = message || (available 
        ? "You can claim this PSN ID on your PlayStation console or the PlayStation app."
        : "This PSN ID is already in use. Try a variation or add numbers.");
      resultBadge.textContent = available ? "Available" : "Taken";

      srStatus.textContent = `${psnId} is ${available ? "available" : "taken"}.`;
    }

    function showError(message) {
      resultCard.classList.add("show");
      resultCard.classList.remove("available");
      resultCard.classList.add("unavailable");

      resultIcon.textContent = "⚠";
      resultTitle.textContent = "Error checking PSN ID";
      resultMessage.textContent = message;
      resultBadge.textContent = "Error";

      srStatus.textContent = "Error checking PSN ID.";
    }

    async function performCheck(psnId) {
      const trimmed = psnId.trim();
      if (!trimmed) {
        showError("Please enter a PSN ID to check.");
        return;
      }

      // Basic validation
      if (trimmed.length < 3 || trimmed.length > 16) {
        showError("PSN IDs must be 3-16 characters long.");
        return;
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        showError("PSN IDs can only contain letters, numbers, hyphens, and underscores.");
        return;
      }

      setLoading(true);

      try {
        const url = `https://psn.gdb.gg/api/users/check/${encodeURIComponent(trimmed)}`;
        const response = await fetch(url, { headers: { Accept: "application/json" } });

        if (!response.ok) {
          throw new Error("API returned an error status");
        }

        const data = await response.json();

        // PSN API returns "found: true" if ID exists (taken), "found: false" if available
        const available = !data.found;
        const effectiveId = data.onlineId || data.searchedFor || trimmed;
        
        // Use the API message, or generate one based on availability
        let apiMessage = data.message || null;
        if (!apiMessage) {
          apiMessage = available 
            ? "This PSN ID appears to be available!"
            : "This PSN ID is already in use.";
        }

        showResult({
          psnId: effectiveId,
          available,
          message: apiMessage,
        });

        updateHistory(effectiveId, available);
      } catch (err) {
        console.error(err);
        showError("Unable to check PSN ID availability. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      performCheck(input.value);
    });
