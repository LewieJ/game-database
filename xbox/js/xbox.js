const form = document.getElementById("gamertag-form");
    const input = document.getElementById("gamertag-input");
    const checkButton = document.getElementById("check-button");
    const srStatus = document.getElementById("sr-status");

    const resultCard = document.getElementById("result-card");
    const resultTitle = document.getElementById("result-title");
    const resultBadge = document.getElementById("result-badge");
    const resultMessage = document.getElementById("result-message");
    const secondaryStatus = document.getElementById("secondary-status");

    const historySection = document.getElementById("history-section");
    const historyList = document.getElementById("history-list");

    // store objects: { tag, available }
    const recentGamertags = [];

    function setLoading(isLoading) {
      if (isLoading) {
        checkButton.disabled = true;
        checkButton.innerHTML = "<span>Checking…</span>";
      } else {
        checkButton.disabled = false;
        checkButton.innerHTML = "<span>Check</span>";
      }
    }

    function updateHistory(gamertag, available) {
      const cleanTag = gamertag.trim();
      if (!cleanTag) return;

      const existingIndex = recentGamertags.findIndex((item) => item.tag === cleanTag);
      if (existingIndex !== -1) {
        recentGamertags.splice(existingIndex, 1);
      }
      recentGamertags.unshift({ tag: cleanTag, available });

      if (recentGamertags.length > 6) {
        recentGamertags.length = 6;
      }

      historyList.innerHTML = "";
      recentGamertags.forEach(({ tag, available }) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className =
          "history-pill " + (available ? "history-pill-available" : "history-pill-unavailable");
        pill.textContent = tag;
        pill.addEventListener("click", () => {
          input.value = tag;
          performCheck(tag);
        });
        historyList.appendChild(pill);
      });

      historySection.hidden = recentGamertags.length === 0;
    }

    function showResult({ gamertag, available, message }) {
      const stateText = available ? "Available" : "Taken";

      resultCard.hidden = false;
      resultCard.classList.toggle("result-available", available);
      resultCard.classList.toggle("result-unavailable", !available);

      // full gamertag, allowed to wrap
      resultTitle.innerHTML = `
        ${available ? "✅" : "❌"}
        <span class="gamertag">${gamertag}</span>
        <span class="availability-text">is ${stateText.toLowerCase()}</span>
      `;

      resultBadge.textContent = stateText.toUpperCase();

      resultMessage.innerHTML = `
        <strong>${message}</strong>
        ${
          available
            ? "<br/>Grab it on your Xbox or the Xbox app before someone else does."
            : "<br/>Try a variation or a short tag that keeps the same vibe."
        }
      `;

      secondaryStatus.textContent = `Last checked: ${gamertag} — ${stateText.toLowerCase()}.`;
      srStatus.textContent = `${gamertag} is ${stateText.toLowerCase()}.`;
    }

    function showError(message) {
      resultCard.hidden = false;
      resultCard.classList.remove("result-available");
      resultCard.classList.add("result-unavailable");

      resultTitle.innerHTML = `⚠️ <span class="gamertag">Error</span>`;
      resultBadge.textContent = "ERROR";
      resultMessage.innerHTML = `<strong>${message}</strong>`;

      secondaryStatus.textContent = "Something went wrong checking that gamertag.";
      srStatus.textContent = "Error while checking gamertag.";
    }

    async function performCheck(gamertag) {
      const trimmed = gamertag.trim();
      if (!trimmed) {
        showError("Please enter a gamertag to check.");
        return;
      }

      setLoading(true);

      try {
        const url = `https://xbox.gdb.gg/check?gamertag=${encodeURIComponent(trimmed)}`;
        const response = await fetch(url, { headers: { Accept: "application/json" } });

        if (!response.ok) {
          throw new Error("API returned an error status");
        }

        const data = await response.json();

        const available = !!data.available;
        const apiMessage =
          data.message ||
          (available
            ? "Gamertag appears to be available."
            : "Gamertag is already taken.");

        const effectiveTag = data.gamertag || trimmed;

        showResult({
          gamertag: effectiveTag,
          available,
          message: apiMessage,
        });

        updateHistory(effectiveTag, available);
      } catch (err) {
        console.error(err);
        showError("Something went wrong checking that gamertag. Please try again in a moment.");
      } finally {
        setLoading(false);
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      performCheck(input.value);
    });
