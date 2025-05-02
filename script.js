const userLocation = document.getElementById("userLocation"),
    weatherIcon = document.querySelector(".weatherIcon"),
    temperature = document.querySelector(".temperature"),
    feelsLike = document.querySelector(".feelsLike"),
    description = document.querySelector(".description"),
    city = document.querySelector(".city"),
    dateTimeValue = document.getElementById("dateTimeValue"),
    Hvalue = document.getElementById("Hvalue"),
    Wvalue = document.getElementById("Wvalue"),
    SRValue = document.getElementById("SRValue"),
    SSValue = document.getElementById("SSValue"),
    Cvalue = document.getElementById("Cvalue"),
    UVvalue = document.getElementById("UVvalue"),
    Pvalue = document.getElementById("Pvalue"),
    forecastContainer = document.getElementById("forecastContainer");

const API_KEY = "6dd2771c2c6207082b94f7a49b59b4f5";
const WEATHER_API_ENDPOINT = `https://api.openweathermap.org/data/2.5/weather?appid=${API_KEY}&units=metric&q=`;
const FORECAST_API_ENDPOINT = `https://api.openweathermap.org/data/2.5/forecast?appid=${API_KEY}&units=metric&q=`;

let map, marker;

function findUserLocation() {
    const cityName = userLocation.value.trim();
    if (!cityName) {
        alert("Please enter a city name!");
        return;
    }

    fetch(WEATHER_API_ENDPOINT + cityName)
        .then(response => response.json())
        .then(data => {
            if (data.cod !== 200) {
                alert(data.message);
                return;
            }

            city.innerHTML = `${data.name}, ${data.sys.country}`;
            weatherIcon.style.backgroundImage = `url(https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png)`;
            temperature.innerHTML = ` ${data.main.temp}°C`;
            feelsLike.innerHTML = `Feels Like: ${data.main.feels_like}°C`;
            description.innerHTML = `<i class="fa-brands fa-cloudversify"></i> ${data.weather[0].description}`;

            const options1 = {
                weekday: "long", month: "long", day: "numeric",
                hour: "numeric", minute: "numeric", hour12: true
            };
            dateTimeValue.innerHTML = getLongFormateDateTime(data.dt, data.timezone, options1);

            Hvalue.innerHTML = `${Math.round(data.main.humidity)}<span>%</span>`;
            Wvalue.innerHTML = `${Math.round(data.wind.speed)}<span>m/s</span>`;
            Cvalue.innerHTML = `${data.clouds.all}<span>%</span>`;
            UVvalue.innerHTML = `${data.main.temp_max}°C`;
            Pvalue.innerHTML = `${data.main.pressure} <span>hPa</span>`;

            const timeOptions = { hour: "numeric", minute: "numeric", hour12: true };
            SRValue.innerHTML = getLongFormateDateTime(data.sys.sunrise, data.timezone, timeOptions);
            SSValue.innerHTML = getLongFormateDateTime(data.sys.sunset, data.timezone, timeOptions);

            updateMap(data.coord.lat, data.coord.lon, data.name);
        })
        .catch(error => console.error("Error fetching weather data:", error));

    fetch(FORECAST_API_ENDPOINT + cityName)
        .then(response => response.json())
        .then(data => {
            displayForecast(data);
            drawForecastChart(data);
        })
        .catch(error => console.error("Error fetching forecast data:", error));
}




// 🗺️ ম্যাপ আপডেট (Leaflet.js)
function updateMap(lat, lon, cityName) {
    if (!map) {
        map = L.map("map").setView([lat, lon], 10);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        }).addTo(map);
    } else {
        map.setView([lat, lon], 10);
    }

    if (marker) map.removeLayer(marker);

    marker = L.marker([lat, lon]).addTo(map)
        .bindPopup(`<b>${cityName}</b>`)
        .openPopup();
}

// 📅 7-Day Forecast Cards
function displayForecast(data) {
    let dailyForecast = {};
    data.list.forEach(item => {
        const date = item.dt_txt.split(" ")[0];
        if (!dailyForecast[date]) {
            dailyForecast[date] = {
                temp: [], icon: item.weather[0].icon,
                description: item.weather[0].description
            };
        }
        dailyForecast[date].temp.push(item.main.temp);
    });

    forecastContainer.innerHTML = "";
    Object.keys(dailyForecast).slice(0, 7).forEach(date => {
        const avgTemp = avg(dailyForecast[date].temp);
        forecastContainer.innerHTML += `
            <div class="forecast-item">
                <p><strong>${formatDate(date)}</strong></p>
                <img src="https://openweathermap.org/img/wn/${dailyForecast[date].icon}@2x.png" alt="weather icon">
                <p>${avgTemp}°C</p>
                <p>${dailyForecast[date].description}</p>
            </div>`;
    });
}

// 📊 Plotly Chart
function drawForecastChart(data) {
    const forecastData = {};

    data.list.forEach(item => {
        const date = item.dt_txt.split(" ")[0];
        if (!forecastData[date]) {
            forecastData[date] = {
                temp: [], humidity: [], wind: [], rain: []
            };
        }
        forecastData[date].temp.push(item.main.temp);
        forecastData[date].humidity.push(item.main.humidity);
        forecastData[date].wind.push(item.wind.speed);
        forecastData[date].rain.push(item.rain?.["3h"] || 0);
    });

    const labels = Object.keys(forecastData).slice(0, 7);
    const temp = labels.map(date => avg(forecastData[date].temp));
    const humidity = labels.map(date => avg(forecastData[date].humidity));
    const wind = labels.map(date => avg(forecastData[date].wind));
    const rain = labels.map(date => avg(forecastData[date].rain));

    const chartData = [
        { x: labels, y: temp, name: "Temp (°C)", type: "bar" },
        { x: labels, y: humidity, name: "Humidity (%)", type: "bar" },
        { x: labels, y: wind, name: "Wind (m/s)", type: "bar" },
        { x: labels, y: rain, name: "Rain (mm)", type: "bar" }
    ];

    const layout = {
        barmode: 'group',
        title: '7-Day Weather Overview',
        yaxis: { title: 'Values' },
        xaxis: { title: 'Date' },
    };

    Plotly.newPlot('forecastChart', chartData, layout);
}

// 🔄 Utils
function avg(arr) {
    return +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
}

function formatUnixTime(dtValue, offSet, options = {}) {
    const date = new Date((dtValue + offSet) * 1000);
    return date.toLocaleString([], { timeZone: "UTC", ...options });
}

function getLongFormateDateTime(dtValue, offSet, options) {
    return formatUnixTime(dtValue, offSet, options);
}

function formatDate(dateStr) {
    const options = { weekday: "long", month: "long", day: "numeric" };
    return new Date(dateStr).toLocaleDateString("en-US", options);
}





