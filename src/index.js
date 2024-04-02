import { calculate } from "./processor";
import * as chart from "./chart";
import * as text from "./text";
import * as monitoring from "./monitoring";
import * as configurator from "./configurator";
import {
  applyTheme,
  displayErrorPage,
  displayLoader,
  getCurrentTime,
  isTransit,
  withErrorHandling,
} from "./utils";

import "./styles/base.css";
import "./styles/spinner.css";
import "./styles/chart.css";
import "./styles/settings.css";

const UPDATE_INTERVAL = 1000;
let chartUpdater;

import { WebMidi } from "webmidi";

WebMidi.enable()
  .then(() => console.log("WebMidi enabled!"))
  .catch((err) => alert(err));

let bodies = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];
let signs = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];
let aspects = ["conjunction", "opposition", "trine", "square", "sextile"];

/**
 * Calculate polar coordinates theta for a celestial body relative to a Cartesian origin.
 *
 * @param {string} celestial_body - The name of the celestial body.
 * @param {Object} cartesian_00 - The Cartesian coordinates of the new origin point.
 * @param {number} cartesian_00.x - The x-coordinate of the origin point.
 * @param {number} cartesian_00.y - The y-coordinate of the origin point.
 * @returns {number} - The polar coordinates theta in degrees.
 */
function calculateTheta(celestial_body, cartesian_00) {
  const { x, y } = document
    .getElementById(
      `chart-astrology-radix-planets-${celestial_body[0].toUpperCase()}${celestial_body.slice(
        1
      )}`
    )
    ?.getBoundingClientRect();
  const coords = {
    x: x - cartesian_00.x,
    y: cartesian_00.y - y,
  };

  let theta = Math.atan(coords.y / coords.x);
  if (coords.x < 0 || coords.y < 0) theta += Math.PI;
  if (coords.x > 0 && coords.y < 0) theta += Math.PI;
  // Rad to deg
  theta *= 180 / Math.PI;
  // Midi input does not take 0 or flloats
  theta = Math.round(theta) || 1;

  return theta;
}

function run({ origin, transit, settings }) {
  console.info("[Configuration] %o", { origin, transit, settings });

  displayLoader(true);
  if (!origin || !settings) return;

  if (chartUpdater) {
    clearInterval(chartUpdater);
    chartUpdater = null;
  }

  let dataRadix = calculate(origin, settings);

  let dataTransit;
  if (isTransit(settings)) {
    dataTransit = calculate(transit, settings);
  }

  text.display(dataRadix, dataTransit, origin, transit, settings);
  chart.draw(dataRadix, dataTransit, settings);

  applyTheme(settings.stroke, settings.bg);
  displayLoader(false);

  const updateChart = withErrorHandling((currentTime) => {
    if (isTransit(settings)) {
      dataTransit = calculate({ ...transit, ...currentTime }, settings);
    } else {
      dataRadix = calculate({ ...origin, ...currentTime }, settings);
      console.log(dataRadix);

      const cartesian_00 = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };

      const initials = new URLSearchParams(window.location.search).get(
        "initials"
      );

      // for each output on WebMidi
      for (let p = 0; p < WebMidi.outputs.length; p++) {
        var output = WebMidi.outputs[p];
        console.log("channel", channel);

        const firstChannel = output.channels[1];

        if (initials) {
          firstChannel.sendControlChange(19, initials.charCodeAt(0));
          firstChannel.sendControlChange(20, initials.charCodeAt(1));
          firstChannel.sendControlChange(21, initials.charCodeAt(2));
        }
        firstChannel.sendControlChange(22, origin.date);
        firstChannel.sendControlChange(23, origin.month + 1);
        firstChannel.sendControlChange(24, +`${origin.year}`.slice(0, 2));
        firstChannel.sendControlChange(25, +`${origin.year}`.slice(2, 4));

        // iterate throiugh all bodies
        for (let i = 0; i < bodies.length; i++) {
          var channel = output.channels[i + 1];
          var key = bodies[i];
          var body = dataRadix.horoscope.Ephemeris[bodies[i]];
          console.log(body);
          var alt = Math.floor(body.position.altaz.topocentric.altitude);
          var house = 13;
          if (dataRadix.horoscope._celestialBodies[bodies[i]].House)
            house = signs.indexOf(
              dataRadix.horoscope._celestialBodies[bodies[i]].House.key
            );

          var sign = 13;
          if (dataRadix.horoscope._celestialBodies[bodies[i]].Sign)
            sign =
              signs.indexOf(
                dataRadix.horoscope._celestialBodies[bodies[i]].Sign.key
              ) + 1;

          const theta = calculateTheta(key, cartesian_00);

          console.log(body.key, alt, theta, house, sign);

          // AZM
          const theta_channel = Math.floor(theta / 128);
          const one_third_theta = Math.floor(theta / 3);
          const theta_remainder = theta % 3;

          channel.sendControlChange(1, one_third_theta);
          channel.sendControlChange(2, one_third_theta);
          channel.sendControlChange(3, one_third_theta + theta_remainder);

          // ALT
          if (alt < 0) {
            channel.sendControlChange(4, Math.abs(alt));
            channel.sendControlChange(5, 0);
          } else {
            channel.sendControlChange(4, 0);
            channel.sendControlChange(5, alt);
          }

          // HOUSE
          channel.sendControlChange(6, house);

          // SIGN
          channel.sendControlChange(7, sign);

          // ASPECTS
          if (dataRadix.horoscope._aspects.points[key] != undefined) {
            var aspects_list = dataRadix.horoscope._aspects.points[key];
            console.log(aspects_list);

            if (dataRadix.horoscope._aspects.points[key] == undefined) continue;

            const valid_aspects_planets = [];

            for (let j = 0; j < aspects_list.length; j++) {
              var o = aspects_list[j].point1Key;
              if (o == key) {
                p = aspects_list[j].point2Key;
              } else {
                p = o;
              }
              valid_aspects_planets.push(p);
              var t = aspects_list[j].aspectKey;
              if (bodies.includes(p) && aspects.includes(t)) {
                console.log("aspect:", key, "with", p, t);
                channel.sendControlChange(
                  8 + bodies.indexOf(p),
                  aspects.indexOf(t) + 1
                );
              }
            }

            const no_aspects = bodies.filter(
              (body) => !valid_aspects_planets.includes(body) && body !== key
            );

            for (const no_aspect of no_aspects) {
              console.log("no aspect:", key, "with:", no_aspect);
              channel.sendControlChange(8 + bodies.indexOf(p), 0);
            }
          }
        }
      }
    }
    text.displayTime(dataRadix, dataTransit, settings);
    chart.draw(dataRadix, dataTransit, settings);
  }, displayErrorPage);

  if (origin.isCurrentTime || (isTransit(settings) && transit.isCurrentTime)) {
    const currentTime = getCurrentTime();
    updateChart(currentTime, settings);
    chartUpdater = setInterval(
      () => updateChart(currentTime, settings),
      UPDATE_INTERVAL
    );
  } else {
    const time = new Date(
      origin.year,
      origin.month - 1,
      origin.date,
      origin.hour,
      origin.minute
    );
    updateChart(time, settings);
    chartUpdater = setInterval(
      () => updateChart(time, settings),
      UPDATE_INTERVAL
    );
  }
}

withErrorHandling(async () => {
  monitoring.init();
  text.init();
  chart.init();
  configurator.init(run);
  run(
    await configurator.getParameters(
      new URLSearchParams(window.location.search)
    )
  );
}, displayErrorPage)();
