import "./../lib/astrochart";
import { debugLog, isCosmogram, isTransit } from "./utils";

let chart;

const DEFAULT_SETTINGS = {
  STROKE_ONLY: false,
  SYMBOL_SCALE: 1,
  POINTS_TEXT_SIZE: 9,
  MARGIN: 40,
  SHIFT_IN_DEGREES: 180,
  COLOR_BACKGROUND: "#F000000",
  POINTS_COLOR: "#32cd32",
  SIGNS_COLOR: "#32cd32",
  CIRCLE_COLOR: "#32cd32",
  LINE_COLOR: "#32cd32",
  CUSPS_FONT_COLOR: "#32cd32",
  SYMBOL_AXIS_FONT_COLOR: "#32cd32",
  COLOR_ARIES: "rgba(0, 0, 0, 0)",
  COLOR_TAURUS: "rgba(0, 0, 0, 0)",
  COLOR_GEMINI: "rgba(0, 0, 0, 0)",
  COLOR_CANCER: "rgba(0, 0, 0, 0)",
  COLOR_LEO: "rgba(0, 0, 0, 0)",
  COLOR_VIRGO: "rgba(0, 0, 0, 0)",
  COLOR_LIBRA: "rgba(0, 0, 0, 0)",
  COLOR_SCORPIO: "rgba(0, 0, 0, 0)",
  COLOR_SAGITTARIUS: "rgba(0, 0, 0, 0)",
  COLOR_CAPRICORN: "rgba(0, 0, 0, 0)",
  COLOR_AQUARIUS: "rgba(0, 0, 0, 0)",
  COLOR_PISCES: "rgba(0, 0, 0, 0)",
  RADIX_ASPECTS_SETTINGS: {
    orbits: {
      ...generateOrbsFor(
        [
          "As",
          "H2",
          "H3",
          "Ic",
          "H5",
          "H6",
          "Ds",
          "H8",
          "H9",
          "Mc",
          "H11",
          "H12",
        ],
        1
      ),
      Sun: {
        conjunction: 12,
        sextile: 6.5,
        square: 10,
        trine: 10,
        opposition: 12,
      },
      Moon: {
        conjunction: 10,
        sextile: 6,
        square: 8,
        trine: 8,
        opposition: 10,
      },
      Jupiter: {
        conjunction: 8,
        sextile: 5,
        square: 7,
        trine: 7,
        opposition: 8,
      },
    },
  },
  TRANSIT_ASPECTS_SETTINGS: {
    orbits: {},
  },
};

function generateOrbsFor(points, orb) {
  return Object.fromEntries(
    points.map((p) => [
      p,
      {
        conjunction: orb,
        sextile: orb,
        square: orb,
        trine: orb,
        opposition: orb,
      },
    ])
  );
}

function getAspectsSettings(settings) {
  const orbs = isTransit(settings)
    ? {
        conjunction: 1,
        sextile: 1,
        square: 1,
        trine: 1,
        opposition: 1,
      }
    : {
        conjunction: 5,
        sextile: 5,
        square: 5,
        trine: 5,
        opposition: 5,
      };
  return {
    conjunction: {
      degree: 0,
      orbit: orbs.conjunction,
      color: "rgba(0, 0,0, 0)",
    },
    sextile: { degree: 60, orbit: orbs.sextile, color: "rgba(0, 0,0, 0)" },
    square: { degree: 90, orbit: orbs.square, color: "rgba(0, 0,0, 0)" },
    trine: { degree: 120, orbit: orbs.trine, color: "rgba(0, 0,0, 0)" },
    opposition: {
      degree: 180,
      orbit: orbs.opposition,
      color: "rgba(0, 0,0, 0)",
    },
  };
}

function getChartSettings(settings) {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings.stroke
      ? {
          STROKE_ONLY: true,
          CIRCLE_COLOR: settings.stroke,
          LINE_COLOR: settings.stroke,
          CUSPS_FONT_COLOR: settings.stroke,
          COLOR_BACKGROUND: "transparent",
          POINTS_COLOR: settings.stroke,
          SIGNS_COLOR: settings.stroke,
          SYMBOL_AXIS_FONT_COLOR: settings.stroke,
        }
      : {}),
    ...(isCosmogram(settings)
      ? {
          SYMBOL_AXIS_FONT_COLOR: "transparent",
          SHIFT_IN_DEGREES: 270,
        }
      : {}),
    ...(isTransit(settings)
      ? {
          MARGIN: 80,
          SYMBOL_SCALE: 0.8,
        }
      : {}),
    ASPECTS: getAspectsSettings(settings),
  };
}

function areChartSettingsChanged(settings) {
  return Object.keys(settings).some((key) => settings[key] !== astrology[key]);
}

export function init(chartSettings) {
  if (!chartSettings) return;

  const chartEl = document.getElementById("chart");
  if (chartEl.children.length > 0) {
    while (chartEl.firstChild) chartEl.removeChild(chartEl.lastChild);
  }

  chart = new astrology.Chart("chart", 600, 600, chartSettings);

  debugLog("astrology.Chart: %o", chart);
}

export function draw(dataRadix, dataTransit, settings) {
  const chartSettings = getChartSettings(settings);
  if (!chart || areChartSettingsChanged(chartSettings)) {
    init(chartSettings);
  }
  const radix = chart.radix(dataRadix);

  // Aspect calculation
  // default is planet to planet, but it is possible add some important points:
  if (settings.aspectsToCusps && !isCosmogram(settings)) {
    radix.addPointsOfInterest({
      As: [dataRadix.cusps[0]],
      H2: [dataRadix.cusps[1]],
      H3: [dataRadix.cusps[2]],
      Ic: [dataRadix.cusps[3]],
      H5: [dataRadix.cusps[4]],
      H6: [dataRadix.cusps[5]],
      Ds: [dataRadix.cusps[6]],
      H8: [dataRadix.cusps[7]],
      H9: [dataRadix.cusps[8]],
      Mc: [dataRadix.cusps[9]],
      H11: [dataRadix.cusps[10]],
      H12: [dataRadix.cusps[11]],
    });
  }

  if (isTransit(settings)) {
    const transit = radix.transit(dataTransit);
    transit.aspects();
    debugLog("astrology.Chart.transit: %o", transit);
  } else {
    radix.aspects();
    debugLog("astrology.Chart.radix: %o", radix);
  }
}
