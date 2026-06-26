/**
 * Karma AI Concierge — End-to-End AI Content Pipeline
 *
 * Pipeline stages:
 *   1. Fetch live weather from OpenWeather API
 *   2. Build a structured concierge prompt from weather data
 *   3. Send prompt to Google Gemini API
 *   4. Display raw data, prompt, and AI response
 */

(function () {
  'use strict';

  // ==================== API CONFIGURATION ====================
  // Replace with your own keys before deploying.
  // OpenWeather: https://openweathermap.org/api
  // Gemini:     https://aistudio.google.com/apikey
  const CONFIG = {
    OPENWEATHER_API_KEY: 'YOUR_OPENWEATHER_API_KEY',
    GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',
    OPENWEATHER_BASE: 'https://api.openweathermap.org/data/2.5/weather',
    GEMINI_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
    // Free-tier friendly model — see https://ai.google.dev/gemini-api/docs/models
    GEMINI_MODEL: 'gemini-2.0-flash',
  };

  // ==================== APPLICATION STATE ====================
  const state = {
    weatherData: null,
    currentPrompt: '',
    isFetchingWeather: false,
    isGeneratingAI: false,
  };

  // ==================== DOM REFERENCES ====================
  const els = {
    citySelect: document.getElementById('citySelect'),
    btnRefreshWeather: document.getElementById('btnRefreshWeather'),
    btnGenerate: document.getElementById('btnGenerate'),
    btnDismissError: document.getElementById('btnDismissError'),
    errorBanner: document.getElementById('errorBanner'),
    errorMessage: document.getElementById('errorMessage'),
    weatherHero: document.getElementById('weatherHero'),
    weatherLoading: document.getElementById('weatherLoading'),
    weatherContent: document.getElementById('weatherContent'),
    weatherEmpty: document.getElementById('weatherEmpty'),
    displayCity: document.getElementById('displayCity'),
    displayTemp: document.getElementById('displayTemp'),
    displayCondition: document.getElementById('displayCondition'),
    displayHumidity: document.getElementById('displayHumidity'),
    displayWind: document.getElementById('displayWind'),
    rawWeatherOutput: document.getElementById('rawWeatherOutput'),
    promptOutput: document.getElementById('promptOutput'),
    aiResponse: document.getElementById('aiResponse'),
    aiStatus: document.getElementById('aiStatus'),
    rawLoading: document.getElementById('rawLoading'),
    promptLoading: document.getElementById('promptLoading'),
  };

  // ==================== INITIALIZATION ====================
  function init() {
    console.info('[Karma AI Concierge] script v4 | Gemini model:', CONFIG.GEMINI_MODEL);
    validateConfig();
    bindEvents();
    fetchWeather();
  }

  function validateConfig() {
    const missing = [];
    if (CONFIG.OPENWEATHER_API_KEY === 'YOUR_OPENWEATHER_API_KEY') missing.push('OpenWeather');
    if (CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') missing.push('Gemini');

    if (missing.length) {
      showError(
        `API keys not configured. Add your ${missing.join(' and ')} key(s) in script.js (CONFIG object) before using the app.`
      );
    }
  }

  function bindEvents() {
    els.btnRefreshWeather.addEventListener('click', fetchWeather);
    els.btnGenerate.addEventListener('click', generateRecommendation);
    els.btnDismissError.addEventListener('click', hideError);
    els.citySelect.addEventListener('change', fetchWeather);
  }

  // ==================== STAGE 1: FETCH WEATHER ====================
  /**
   * Calls OpenWeather API for the selected Karma resort city.
   * Stores raw JSON in state and updates the UI.
   */
  async function fetchWeather() {
    if (state.isFetchingWeather) return;

    const city = els.citySelect.value;
    state.isFetchingWeather = true;
    setWeatherLoading(true);
    hideError();
    els.btnGenerate.disabled = true;

    try {
      assertApiKey(CONFIG.OPENWEATHER_API_KEY, 'OpenWeather');

      const url = `${CONFIG.OPENWEATHER_BASE}?q=${encodeURIComponent(city)}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric`;

      const response = await fetch(url);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(parseOpenWeatherError(response.status, body));
      }

      const data = await response.json();
      state.weatherData = normalizeWeather(data);

      // Update all weather-related UI
      renderWeatherHero(state.weatherData);
      renderRawWeather(data);
      buildAndDisplayPrompt(state.weatherData);

      els.btnGenerate.disabled = false;
    } catch (err) {
      state.weatherData = null;
      showWeatherEmpty();
      showError(err.message || 'Failed to fetch weather data.');
      els.rawWeatherOutput.textContent = 'Weather fetch failed.';
      els.promptOutput.textContent = 'Prompt unavailable — weather data required.';
    } finally {
      state.isFetchingWeather = false;
      setWeatherLoading(false);
      els.btnRefreshWeather.classList.remove('is-loading');
    }
  }

  /**
   * Normalises OpenWeather response into a flat object for display and prompting.
   */
  function normalizeWeather(data) {
    return {
      city: data.name,
      country: data.sys?.country || '',
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      condition: data.weather[0]?.description || 'Unknown',
      humidity: data.main.humidity,
      windSpeed: data.wind?.speed ?? 0,
      windUnit: 'm/s',
    };
  }

  function renderWeatherHero(weather) {
    els.weatherLoading.hidden = true;
    els.weatherEmpty.hidden = true;
    els.weatherContent.hidden = false;

    const location = weather.country
      ? `${weather.city}, ${weather.country}`
      : weather.city;

    els.displayCity.textContent = location;
    els.displayTemp.textContent = `${weather.temperature}°C`;
    els.displayCondition.textContent = weather.condition;
    els.displayHumidity.textContent = `${weather.humidity}%`;
    els.displayWind.textContent = `${weather.windSpeed} ${weather.windUnit}`;
  }

  function renderRawWeather(rawData) {
    els.rawLoading.hidden = true;
    els.rawWeatherOutput.textContent = JSON.stringify(rawData, null, 2);
  }

  function setWeatherLoading(isLoading) {
    if (isLoading) {
      els.weatherLoading.hidden = false;
      els.weatherContent.hidden = true;
      els.weatherEmpty.hidden = true;
      els.btnRefreshWeather.classList.add('is-loading');
      els.rawLoading.hidden = false;
      els.rawWeatherOutput.textContent = '';
    }
  }

  function showWeatherEmpty() {
    els.weatherLoading.hidden = true;
    els.weatherContent.hidden = true;
    els.weatherEmpty.hidden = false;
  }

  // ==================== STAGE 2: BUILD PROMPT ====================
  /**
   * Constructs the concierge prompt dynamically from live weather conditions.
   */
  function buildPrompt(weather) {
    const resortName = els.citySelect.selectedOptions[0]?.textContent || weather.city;

    return `You are an AI Concierge for Karma Group.

Using the following live weather conditions, recommend activities, packing suggestions, dining ideas and resort experiences.

Resort: ${resortName}

Weather:
Temperature: ${weather.temperature}°C (feels like ${weather.feelsLike}°C)
Humidity: ${weather.humidity}%
Wind: ${weather.windSpeed} ${weather.windUnit}
Condition: ${weather.condition}

Please respond with four clearly labelled sections:
1. Recommended Activities
2. Packing Suggestions
3. Dining Ideas
4. Resort Experiences

Keep the tone refined and luxurious, as befits Karma Group's premium hospitality brand. Be specific and practical.`;
  }

  function buildAndDisplayPrompt(weather) {
    state.currentPrompt = buildPrompt(weather);
    els.promptLoading.hidden = true;
    els.promptOutput.textContent = state.currentPrompt;
  }

  // ==================== STAGE 3: CALL GEMINI LLM ====================
  /**
   * Builds the Gemini generateContent endpoint URL for the configured model.
   * https://ai.google.dev/api/generate-content
   */
  function buildGeminiUrl(model) {
    return `${CONFIG.GEMINI_BASE}/${model}:generateContent`;
  }

  /**
   * Builds Gemini request headers (API key via x-goog-api-key).
   */
  function buildGeminiHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': CONFIG.GEMINI_API_KEY,
    };
  }

  /**
   * Performs a single Gemini generateContent request.
   */
  async function callGeminiGenerateContent(model, promptText) {
    const url = buildGeminiUrl(model);
    const requestBody = {
      contents: [
        {
          parts: [{ text: promptText }],
        },
      ],
    };

    console.group(`[Gemini] Outgoing request → ${model}`);
    console.log('URL:', url);
    console.log('Headers:', { ...buildGeminiHeaders(), 'x-goog-api-key': '[REDACTED]' });
    console.log('Body:', requestBody);
    console.groupEnd();

    const response = await fetch(url, {
      method: 'POST',
      headers: buildGeminiHeaders(),
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let responseBody;

    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseBody = { raw: responseText };
    }

    console.group(`[Gemini] Incoming response ← ${model}`);
    console.log('HTTP Status:', response.status, response.statusText);
    console.log('Body:', responseBody);
    console.groupEnd();

    return {
      model,
      status: response.status,
      ok: response.ok,
      body: responseBody,
    };
  }

  /**
   * Sends the built prompt to Gemini and displays the AI response.
   */
  async function generateRecommendation() {
    if (state.isGeneratingAI || !state.weatherData || !state.currentPrompt) return;

    state.isGeneratingAI = true;
    els.btnGenerate.disabled = true;
    els.aiStatus.hidden = false;
    hideError();

    els.aiResponse.innerHTML = '';

    try {
      assertApiKey(CONFIG.GEMINI_API_KEY, 'Gemini');

      const result = await callGeminiGenerateContent(CONFIG.GEMINI_MODEL, state.currentPrompt);

      if (!result.ok) {
        throw createGeminiFailure(result.status, result.body, result.model);
      }

      const content = extractGeminiContent(result.body);

      if (!content) {
        throw createGeminiFailure(result.status, {
          ...result.body,
          error: {
            message: 'The AI returned an empty response.',
          },
        }, result.model);
      }

      console.info('[Gemini] Success via model:', result.model);
      renderAIResponse(content, result.model);
    } catch (err) {
      const failure = normalizeGeminiFailure(err);

      console.error('[Gemini] Request failed:', failure);

      showError(failure.summary);
      renderGeminiFailure(failure);
    } finally {
      state.isGeneratingAI = false;
      els.btnGenerate.disabled = !state.weatherData;
      els.aiStatus.hidden = true;
    }
  }

  /**
   * Extracts assistant text from Gemini generateContent response.
   */
  function extractGeminiContent(data) {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return '';

    return parts
      .map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim();
  }

  function createGeminiFailure(status, body, modelAttempted) {
    const error = body?.error || {};
    const message =
      error.message ||
      body?.message ||
      `Gemini API error (${status}).`;

    return {
      name: 'GeminiError',
      status: status || 0,
      message,
      modelAttempted: modelAttempted || CONFIG.GEMINI_MODEL,
      body,
      summary: `[HTTP ${status || 'Network'}] ${message}`,
    };
  }

  function normalizeGeminiFailure(err) {
    if (err?.name === 'GeminiError') return err;

    return {
      name: err?.name || 'Error',
      status: 0,
      message: err?.message || 'Network request failed.',
      body: {
        error: {
          message: err?.message || 'Network request failed.',
          hint: 'If status is 0, the browser blocked the request before Gemini responded (network/CORS/offline).',
        },
      },
      summary: `[Network] ${err?.message || 'Request failed before receiving an HTTP response.'}`,
    };
  }

  function renderGeminiFailure(failure) {
    const json = JSON.stringify(failure.body, null, 2);

    els.aiResponse.innerHTML = `
      <div class="api-debug">
        <h3>Gemini request failed</h3>
        <dl class="api-debug__meta">
          <div><dt>HTTP status</dt><dd>${escapeHtml(String(failure.status || 'Network error'))}</dd></div>
          <div><dt>Error message</dt><dd>${escapeHtml(failure.message)}</dd></div>
          <div><dt>Model requested</dt><dd>${escapeHtml(failure.modelAttempted || CONFIG.GEMINI_MODEL)}</dd></div>
        </dl>
        <p class="api-debug__label">Full JSON response</p>
        <pre class="api-debug__json">${escapeHtml(json)}</pre>
      </div>
    `;
  }

  /**
   * Converts plain-text LLM output to formatted HTML (headings, lists, paragraphs).
   */
  function renderAIResponse(text, resolvedModel) {
    const html = formatResponseText(text);
    const modelNote = resolvedModel
      ? `<p class="pipeline__model-note">Generated by <strong>${escapeHtml(resolvedModel)}</strong></p>`
      : '';
    els.aiResponse.innerHTML = modelNote + html;
  }

  function formatResponseText(text) {
    const lines = text.split('\n');
    let html = '';
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) { html += '</ul>'; inList = false; }
        continue;
      }

      // Numbered section headers (e.g. "1. Recommended Activities")
      if (/^\d+\.\s/.test(trimmed)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3>${escapeHtml(trimmed)}</h3>`;
        continue;
      }

      // Markdown-style headers
      if (/^#{1,3}\s/.test(trimmed)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3>${escapeHtml(trimmed.replace(/^#+\s*/, ''))}</h3>`;
        continue;
      }

      // Bullet points
      if (/^[-*•]\s/.test(trimmed)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li>${escapeHtml(trimmed.replace(/^[-*•]\s*/, ''))}</li>`;
        continue;
      }

      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${escapeHtml(trimmed)}</p>`;
    }

    if (inList) html += '</ul>';
    return html;
  }

  // ==================== ERROR HANDLING ====================
  function showError(message) {
    els.errorMessage.textContent = message;
    els.errorBanner.hidden = false;
  }

  function hideError() {
    els.errorBanner.hidden = true;
    els.errorMessage.textContent = '';
  }

  function assertApiKey(key, provider) {
    if (!key || key.startsWith('YOUR_')) {
      throw new Error(`${provider} API key is not configured. Edit CONFIG in script.js.`);
    }
  }

  function parseOpenWeatherError(status, body) {
    const msg = body?.message || '';
    switch (status) {
      case 401: return 'Invalid OpenWeather API key. Check CONFIG.OPENWEATHER_API_KEY in script.js.';
      case 404: return 'City not found. Try a different resort destination.';
      case 429: return 'OpenWeather rate limit exceeded. Please wait a moment and try again.';
      default: return msg || `Weather API error (${status}). Please try again.`;
    }
  }
  // ==================== UTILITIES ====================
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== BOOT ====================
  document.addEventListener('DOMContentLoaded', init);
})();
