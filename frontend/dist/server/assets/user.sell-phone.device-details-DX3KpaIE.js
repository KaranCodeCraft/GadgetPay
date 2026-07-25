import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/user.sell-phone.device-details.tsx?tsr-split=component
var DEVICE_DETAILS_STORAGE_KEY = "gadgetpe_user_sell_phone_device_details";
var DEVICE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_phone_selected_model";
var MAX_SLIDE_ITEMS = 5;
var issueOptions = [
	"Broken/scratch on device screen",
	"Dead Spot/Visible line and Discoloration on screen",
	"Scratch/Dent on device body",
	"Device panel missing/broken"
];
var issueIcons = {
	"Broken/scratch on device screen": /* @__PURE__ */ jsxs("svg", {
		viewBox: "0 0 80 110",
		fill: "none",
		xmlns: "http://www.w3.org/2000/svg",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ jsx("rect", {
				x: "18",
				y: "4",
				width: "44",
				height: "102",
				rx: "7",
				stroke: "#1a2733",
				strokeWidth: "2"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "28",
				y: "9",
				width: "24",
				height: "3",
				rx: "1.5",
				stroke: "#1a2733",
				strokeWidth: "1.5"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "22",
				y: "17",
				width: "36",
				height: "76",
				rx: "2",
				stroke: "#d0d8e0",
				strokeWidth: "1",
				fill: "#f8fafc"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "29",
				y1: "22",
				x2: "48",
				y2: "70",
				stroke: "#20bf97",
				strokeWidth: "2.5",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "38",
				y1: "20",
				x2: "58",
				y2: "68",
				stroke: "#20bf97",
				strokeWidth: "1.5",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "24",
				y1: "38",
				x2: "36",
				y2: "58",
				stroke: "#20bf97",
				strokeWidth: "1.5",
				strokeLinecap: "round"
			})
		]
	}),
	"Dead Spot/Visible line and Discoloration on screen": /* @__PURE__ */ jsxs("svg", {
		viewBox: "0 0 80 110",
		fill: "none",
		xmlns: "http://www.w3.org/2000/svg",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ jsx("rect", {
				x: "18",
				y: "4",
				width: "44",
				height: "102",
				rx: "7",
				stroke: "#1a2733",
				strokeWidth: "2"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "28",
				y: "9",
				width: "24",
				height: "3",
				rx: "1.5",
				stroke: "#1a2733",
				strokeWidth: "1.5"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "22",
				y: "17",
				width: "36",
				height: "76",
				rx: "2",
				stroke: "#d0d8e0",
				strokeWidth: "1",
				fill: "#f8fafc"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "36",
				y: "17",
				width: "8",
				height: "76",
				rx: "1",
				fill: "#20bf97",
				opacity: "0.3"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "40",
				y1: "17",
				x2: "40",
				y2: "93",
				stroke: "#20bf97",
				strokeWidth: "2",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "40",
				cy: "45",
				r: "4",
				fill: "#20bf97",
				opacity: "0.5"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "40",
				cy: "62",
				r: "3",
				fill: "#20bf97",
				opacity: "0.4"
			})
		]
	}),
	"Scratch/Dent on device body": /* @__PURE__ */ jsxs("svg", {
		viewBox: "0 0 80 110",
		fill: "none",
		xmlns: "http://www.w3.org/2000/svg",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ jsx("rect", {
				x: "18",
				y: "4",
				width: "44",
				height: "102",
				rx: "7",
				stroke: "#1a2733",
				strokeWidth: "2"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "28",
				y: "9",
				width: "24",
				height: "3",
				rx: "1.5",
				stroke: "#1a2733",
				strokeWidth: "1.5"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "22",
				y: "17",
				width: "36",
				height: "76",
				rx: "2",
				stroke: "#d0d8e0",
				strokeWidth: "1",
				fill: "#f8fafc"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M18 38 Q11 44 18 50",
				stroke: "#20bf97",
				strokeWidth: "2.5",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M62 55 Q69 61 62 67",
				stroke: "#20bf97",
				strokeWidth: "2.5",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M30 100 Q34 106 40 104",
				stroke: "#20bf97",
				strokeWidth: "2",
				strokeLinecap: "round"
			})
		]
	}),
	"Device panel missing/broken": /* @__PURE__ */ jsxs("svg", {
		viewBox: "0 0 80 110",
		fill: "none",
		xmlns: "http://www.w3.org/2000/svg",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ jsx("path", {
				d: "M25 4 L56 4 Q62 4 62 10 L62 102 Q62 106 58 106 L22 106 Q18 106 18 102 L18 10 Q18 4 25 4Z",
				stroke: "#1a2733",
				strokeWidth: "2"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "28",
				y: "9",
				width: "24",
				height: "3",
				rx: "1.5",
				stroke: "#1a2733",
				strokeWidth: "1.5"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "22",
				y: "17",
				width: "36",
				height: "76",
				rx: "2",
				stroke: "#d0d8e0",
				strokeWidth: "1",
				fill: "#f8fafc"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M49 4 L62 4 L62 18 L49 4Z",
				fill: "#f0faf7",
				stroke: "#20bf97",
				strokeWidth: "2",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M49 4 L55 12",
				stroke: "#20bf97",
				strokeWidth: "2",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "58",
				cy: "20",
				r: "5",
				fill: "none",
				stroke: "#20bf97",
				strokeWidth: "1.5"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "56",
				y1: "18",
				x2: "60",
				y2: "22",
				stroke: "#20bf97",
				strokeWidth: "1.5",
				strokeLinecap: "round"
			})
		]
	})
};
var scratchOptions = [
	{
		value: "moreThan2",
		label: "More than 2 scratches",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "35",
					cy: "13",
					r: "2.5",
					stroke: "#1a2733",
					strokeWidth: "1.2",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "26",
					y1: "28",
					x2: "44",
					y2: "58",
					stroke: "#20bf97",
					strokeWidth: "2.5",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "36",
					y1: "24",
					x2: "55",
					y2: "54",
					stroke: "#20bf97",
					strokeWidth: "2",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "23",
					y1: "48",
					x2: "38",
					y2: "72",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				})
			]
		})
	},
	{
		value: "oneTo2",
		label: "1-2 scratches",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "35",
					cy: "13",
					r: "2.5",
					stroke: "#1a2733",
					strokeWidth: "1.2",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "26",
					y1: "28",
					x2: "44",
					y2: "58",
					stroke: "#20bf97",
					strokeWidth: "2.5",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "36",
					y1: "24",
					x2: "55",
					y2: "54",
					stroke: "#20bf97",
					strokeWidth: "2",
					strokeLinecap: "round"
				})
			]
		})
	},
	{
		value: "none",
		label: "No scratches",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "35",
					cy: "13",
					r: "2.5",
					stroke: "#1a2733",
					strokeWidth: "1.2",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M50 32 L51.5 36.5 L56 38 L51.5 39.5 L50 44 L48.5 39.5 L44 38 L48.5 36.5 Z",
					fill: "#20bf97"
				})
			]
		})
	}
];
var dentOptions = [
	{
		value: "majorOrMore",
		label: "Major dent(s) or more than 2",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M62 28 Q72 35 62 42",
					stroke: "#20bf97",
					strokeWidth: "2.5",
					strokeLinecap: "round",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M18 52 Q8 59 18 66",
					stroke: "#20bf97",
					strokeWidth: "2.5",
					strokeLinecap: "round",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M62 76 Q72 81 62 86",
					stroke: "#20bf97",
					strokeWidth: "2",
					strokeLinecap: "round",
					fill: "none"
				})
			]
		})
	},
	{
		value: "oneTo2Minor",
		label: "1-2 minor dents",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M62 40 Q70 47 62 54",
					stroke: "#20bf97",
					strokeWidth: "2",
					strokeLinecap: "round",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M18 62 Q10 69 18 76",
					stroke: "#20bf97",
					strokeWidth: "2",
					strokeLinecap: "round",
					fill: "none"
				})
			]
		})
	},
	{
		value: "none",
		label: "No dents",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M50 32 L51.5 36.5 L56 38 L51.5 39.5 L50 44 L48.5 39.5 L44 38 L48.5 36.5 Z",
					fill: "#20bf97"
				})
			]
		})
	}
];
var panelConditionOptions = [
	{
		value: "cracked",
		label: "Cracked/ broken side or back panel",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "34",
					y: "8",
					width: "12",
					height: "94",
					rx: "5",
					stroke: "#1a2733",
					strokeWidth: "2",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "30",
					y: "28",
					width: "4",
					height: "14",
					rx: "2",
					stroke: "#1a2733",
					strokeWidth: "1.5",
					fill: "#e2e8f0"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "46",
					y: "42",
					width: "4",
					height: "10",
					rx: "2",
					stroke: "#1a2733",
					strokeWidth: "1.5",
					fill: "#e2e8f0"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M36 30 L39 44 L36 52 L40 66",
					stroke: "#20bf97",
					strokeWidth: "2",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "55",
					cy: "28",
					r: "8",
					fill: "#fff5f5",
					stroke: "#e07060",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "52",
					y1: "25",
					x2: "58",
					y2: "31",
					stroke: "#e07060",
					strokeWidth: "2",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "58",
					y1: "25",
					x2: "52",
					y2: "31",
					stroke: "#e07060",
					strokeWidth: "2",
					strokeLinecap: "round"
				})
			]
		})
	},
	{
		value: "missing",
		label: "Missing side or back panel",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("path", {
					d: "M34,8 L46,8 Q46,8 46,13 L46,45 L34,45 L34,8 Z",
					stroke: "#1a2733",
					strokeWidth: "2",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M34,55 L46,55 L46,96 Q46,102 40,102 Q34,102 34,96 Z",
					stroke: "#1a2733",
					strokeWidth: "2",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "34",
					y1: "45",
					x2: "46",
					y2: "45",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					strokeDasharray: "3 2"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "34",
					y1: "55",
					x2: "46",
					y2: "55",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					strokeDasharray: "3 2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "30",
					y: "28",
					width: "4",
					height: "12",
					rx: "2",
					stroke: "#1a2733",
					strokeWidth: "1.5",
					fill: "#e2e8f0"
				}),
				/* @__PURE__ */ jsx("polygon", {
					points: "55,18 63,33 47,33",
					fill: "#fff8e6",
					stroke: "#e09020",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "55",
					y1: "23",
					x2: "55",
					y2: "28",
					stroke: "#e09020",
					strokeWidth: "2",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "55",
					cy: "31",
					r: "1.2",
					fill: "#e09020"
				})
			]
		})
	},
	{
		value: "none",
		label: "No defect on side or back panel",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "34",
					y: "8",
					width: "12",
					height: "94",
					rx: "5",
					stroke: "#1a2733",
					strokeWidth: "2",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "30",
					y: "28",
					width: "4",
					height: "14",
					rx: "2",
					stroke: "#1a2733",
					strokeWidth: "1.5",
					fill: "#e2e8f0"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "46",
					y: "42",
					width: "4",
					height: "10",
					rx: "2",
					stroke: "#1a2733",
					strokeWidth: "1.5",
					fill: "#e2e8f0"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M54 22 L55.5 26.5 L60 28 L55.5 29.5 L54 34 L52.5 29.5 L48 28 L52.5 26.5 Z",
					fill: "#20bf97"
				})
			]
		})
	}
];
var deviceBentOptions = [
	{
		value: "bent",
		label: "Bent/ curved panel",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("path", {
					d: "M34,8 Q28,55 34,102 L46,102 Q52,55 46,8 Z",
					stroke: "#1a2733",
					strokeWidth: "2",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M30,30 Q26,55 30,80",
					stroke: "#1a2733",
					strokeWidth: "1.5",
					strokeDasharray: "3 2",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "30",
					y: "28",
					width: "4",
					height: "12",
					rx: "2",
					stroke: "#1a2733",
					strokeWidth: "1.5",
					fill: "#e2e8f0"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "55",
					cy: "28",
					r: "8",
					fill: "#fff5f5",
					stroke: "#e07060",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "52",
					y1: "25",
					x2: "58",
					y2: "31",
					stroke: "#e07060",
					strokeWidth: "2",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "58",
					y1: "25",
					x2: "52",
					y2: "31",
					stroke: "#e07060",
					strokeWidth: "2",
					strokeLinecap: "round"
				})
			]
		})
	},
	{
		value: "looseScreen",
		label: "Loose screen (Gap in screen and body)",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "36",
					y: "8",
					width: "10",
					height: "94",
					rx: "5",
					stroke: "#1a2733",
					strokeWidth: "2",
					fill: "#f0faf7"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "34",
					y: "10",
					width: "4",
					height: "88",
					rx: "2",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "34",
					y1: "10",
					x2: "34",
					y2: "98",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					strokeDasharray: "4 3"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "30",
					y: "30",
					width: "4",
					height: "12",
					rx: "2",
					stroke: "#1a2733",
					strokeWidth: "1.5",
					fill: "#e2e8f0"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "26",
					cy: "50",
					r: "3",
					fill: "#20bf97",
					opacity: "0.6"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "26",
					cy: "58",
					r: "3",
					fill: "#20bf97",
					opacity: "0.6"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "26",
					cy: "66",
					r: "3",
					fill: "#20bf97",
					opacity: "0.6"
				})
			]
		})
	},
	{
		value: "none",
		label: "Phone not bent",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "34",
					y: "8",
					width: "12",
					height: "94",
					rx: "5",
					stroke: "#1a2733",
					strokeWidth: "2",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "30",
					y: "28",
					width: "4",
					height: "14",
					rx: "2",
					stroke: "#1a2733",
					strokeWidth: "1.5",
					fill: "#e2e8f0"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "46",
					y: "42",
					width: "4",
					height: "10",
					rx: "2",
					stroke: "#1a2733",
					strokeWidth: "1.5",
					fill: "#e2e8f0"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M54 22 L55.5 26.5 L60 28 L55.5 29.5 L54 34 L52.5 29.5 L48 28 L52.5 26.5 Z",
					fill: "#20bf97"
				})
			]
		})
	}
];
var accessoryOptions = [{
	value: "originalCharger",
	label: "Original Charger of Device",
	svg: /* @__PURE__ */ jsxs("svg", {
		viewBox: "0 0 100 100",
		fill: "none",
		xmlns: "http://www.w3.org/2000/svg",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ jsx("rect", {
				x: "30",
				y: "18",
				width: "40",
				height: "44",
				rx: "8",
				stroke: "#1a2733",
				strokeWidth: "2.5",
				fill: "#f8fafc"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "42",
				y: "12",
				width: "16",
				height: "8",
				rx: "2",
				stroke: "#20bf97",
				strokeWidth: "2",
				fill: "#e8f7f3"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "45",
				y: "14",
				width: "10",
				height: "4",
				rx: "1",
				fill: "#20bf97",
				opacity: "0.5"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "40",
				y: "62",
				width: "6",
				height: "14",
				rx: "2",
				stroke: "#1a2733",
				strokeWidth: "2",
				fill: "#d0d8e0"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "54",
				y: "62",
				width: "6",
				height: "14",
				rx: "2",
				stroke: "#1a2733",
				strokeWidth: "2",
				fill: "#d0d8e0"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "50",
				cy: "40",
				r: "8",
				stroke: "#20bf97",
				strokeWidth: "1.5",
				fill: "#e8f7f3"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M46 40 L50 36 L54 40 L50 44 Z",
				fill: "#20bf97"
			})
		]
	})
}, {
	value: "originalBoxWithIMEI",
	label: "Original Box with same IMEI",
	svg: /* @__PURE__ */ jsxs("svg", {
		viewBox: "0 0 100 100",
		fill: "none",
		xmlns: "http://www.w3.org/2000/svg",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ jsx("rect", {
				x: "15",
				y: "38",
				width: "70",
				height: "48",
				rx: "3",
				stroke: "#1a2733",
				strokeWidth: "2.5",
				fill: "#f8fafc"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "15",
				y: "22",
				width: "70",
				height: "18",
				rx: "3",
				stroke: "#1a2733",
				strokeWidth: "2",
				fill: "#e8f7f3"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "50",
				y1: "22",
				x2: "50",
				y2: "40",
				stroke: "#20bf97",
				strokeWidth: "2",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "15",
				y: "30",
				width: "70",
				height: "6",
				fill: "#20bf97",
				opacity: "0.15"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "15",
				y1: "33",
				x2: "85",
				y2: "33",
				stroke: "#20bf97",
				strokeWidth: "1.5"
			}),
			/* @__PURE__ */ jsx("rect", {
				x: "25",
				y: "52",
				width: "50",
				height: "20",
				rx: "2",
				stroke: "#d0d8e0",
				strokeWidth: "1",
				fill: "#f0f4f8"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "29",
				y1: "58",
				x2: "71",
				y2: "58",
				stroke: "#20bf97",
				strokeWidth: "1.2",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "29",
				y1: "63",
				x2: "60",
				y2: "63",
				stroke: "#d0d8e0",
				strokeWidth: "1",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "29",
				y1: "67",
				x2: "55",
				y2: "67",
				stroke: "#d0d8e0",
				strokeWidth: "1",
				strokeLinecap: "round"
			})
		]
	})
}];
var warnTriangle = (cx, cy) => /* @__PURE__ */ jsxs(Fragment, { children: [
	/* @__PURE__ */ jsx("polygon", {
		points: `${cx},${cy - 8} ${cx + 7},${cy + 4} ${cx - 7},${cy + 4}`,
		fill: "#fff3cd",
		stroke: "#e09020",
		strokeWidth: "1.2"
	}),
	/* @__PURE__ */ jsx("line", {
		x1: cx,
		y1: cy - 4,
		x2: cx,
		y2: cy,
		stroke: "#e09020",
		strokeWidth: "1.5",
		strokeLinecap: "round"
	}),
	/* @__PURE__ */ jsx("circle", {
		cx,
		cy: cy + 2.5,
		r: "0.9",
		fill: "#e09020"
	})
] });
var functionalProblemOptions = [
	{
		value: "frontCameraNotWorking",
		label: "Front Camera not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "40",
					cy: "13",
					r: "2.5",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "40",
					cy: "13",
					r: "1",
					fill: "#20bf97"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "backCameraNotWorking",
		label: "Back Camera not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "26",
					y: "22",
					width: "14",
					height: "14",
					rx: "3",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "33",
					cy: "29",
					r: "4",
					stroke: "#20bf97",
					strokeWidth: "1.2",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "33",
					cy: "29",
					r: "1.5",
					fill: "#20bf97"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "volumeButtonNotWorking",
		label: "Volume Button not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "13",
					y: "30",
					width: "5",
					height: "10",
					rx: "2",
					stroke: "#20bf97",
					strokeWidth: "1.8",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "13",
					y: "44",
					width: "5",
					height: "10",
					rx: "2",
					stroke: "#20bf97",
					strokeWidth: "1.8",
					fill: "#e8f7f3"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "fingerTouchNotWorking",
		label: "Finger Touch not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M38 65 L38 45 Q38 42 40 42 Q42 42 42 45 L42 55 Q43 52 45 52 Q47 52 47 55 L47 60 Q48 57 50 57 Q52 57 52 60 L52 68 Q52 74 46 76 L40 76 Q36 76 35 72 Z",
					stroke: "#20bf97",
					strokeWidth: "1.2",
					fill: "#e8f7f3"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "wifiNotWorking",
		label: "WiFi not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M28 52 Q40 40 52 52",
					stroke: "#20bf97",
					strokeWidth: "2",
					strokeLinecap: "round",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M32 57 Q40 48 48 57",
					stroke: "#20bf97",
					strokeWidth: "2",
					strokeLinecap: "round",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M36 62 Q40 56 44 62",
					stroke: "#20bf97",
					strokeWidth: "2",
					strokeLinecap: "round",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "40",
					cy: "66",
					r: "2",
					fill: "#20bf97"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "batteryFaulty",
		label: "Battery Faulty",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "29",
					y: "44",
					width: "22",
					height: "14",
					rx: "2",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "51",
					y: "48",
					width: "3",
					height: "6",
					rx: "1",
					fill: "#20bf97"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "31",
					y: "46",
					width: "8",
					height: "10",
					rx: "1",
					fill: "#20bf97",
					opacity: "0.5"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "batteryHealthBelow80Service",
		label: "Battery health Below 80 (battery in service)",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "29",
					y: "43",
					width: "22",
					height: "16",
					rx: "2",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "51",
					y: "48",
					width: "3",
					height: "6",
					rx: "1",
					fill: "#20bf97"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "31",
					y: "45",
					width: "10",
					height: "12",
					rx: "1",
					fill: "#20bf97",
					opacity: "0.35"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "33",
					y1: "53",
					x2: "47",
					y2: "53",
					stroke: "#20bf97",
					strokeWidth: "1.6",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "39",
					y1: "49",
					x2: "39",
					y2: "57",
					stroke: "#20bf97",
					strokeWidth: "1.6",
					strokeLinecap: "round"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "speakerFaulty",
		label: "Speaker Faulty",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "31",
					y: "98",
					width: "18",
					height: "4",
					rx: "2",
					stroke: "#20bf97",
					strokeWidth: "1.2",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "34",
					y1: "98",
					x2: "34",
					y2: "102",
					stroke: "#20bf97",
					strokeWidth: "1"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "37",
					y1: "98",
					x2: "37",
					y2: "102",
					stroke: "#20bf97",
					strokeWidth: "1"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "40",
					y1: "98",
					x2: "40",
					y2: "102",
					stroke: "#20bf97",
					strokeWidth: "1"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "43",
					y1: "98",
					x2: "43",
					y2: "102",
					stroke: "#20bf97",
					strokeWidth: "1"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "46",
					y1: "98",
					x2: "46",
					y2: "102",
					stroke: "#20bf97",
					strokeWidth: "1"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "powerButtonNotWorking",
		label: "Power Button not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "62",
					y: "36",
					width: "5",
					height: "14",
					rx: "2",
					stroke: "#20bf97",
					strokeWidth: "1.8",
					fill: "#e8f7f3"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "chargingPortNotWorking",
		label: "Charging Port not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "34",
					y: "103",
					width: "12",
					height: "4",
					rx: "2",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "40",
					y1: "103",
					x2: "40",
					y2: "98",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M36 95 L40 98 L44 95",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					fill: "none"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "faceSensorNotWorking",
		label: "Face Sensor not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("ellipse", {
					cx: "40",
					cy: "52",
					rx: "10",
					ry: "12",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "36",
					cy: "49",
					r: "1.5",
					fill: "#20bf97"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "44",
					cy: "49",
					r: "1.5",
					fill: "#20bf97"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M35 56 Q40 60 45 56",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					fill: "none"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "silentButtonNotWorking",
		label: "Silent Button not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "13",
					y: "22",
					width: "5",
					height: "8",
					rx: "2",
					stroke: "#20bf97",
					strokeWidth: "1.8",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "15.5",
					y1: "22",
					x2: "15.5",
					y2: "20",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "audioReceiverNotWorking",
		label: "Audio Receiver not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#20bf97",
					strokeWidth: "2",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "cameraGlassBroken",
		label: "Camera Glass Broken",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "26",
					y: "22",
					width: "14",
					height: "14",
					rx: "3",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "33",
					cy: "29",
					r: "4",
					stroke: "#20bf97",
					strokeWidth: "1.2",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "30",
					y1: "24",
					x2: "36",
					y2: "34",
					stroke: "#1a2733",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "28",
					y1: "28",
					x2: "34",
					y2: "22",
					stroke: "#1a2733",
					strokeWidth: "1",
					strokeLinecap: "round"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "bluetoothNotWorking",
		label: "Bluetooth not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M38 44 L46 50 L38 56 L38 44 Z M38 44 L38 56 M46 44 L38 50 M38 50 L46 56",
					stroke: "#20bf97",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					fill: "none"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "vibratorNotWorking",
		label: "Vibrator is not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M12 50 Q15 45 12 40",
					stroke: "#20bf97",
					strokeWidth: "2",
					strokeLinecap: "round",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M9 52 Q13 45 9 38",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M68 50 Q65 45 68 40",
					stroke: "#20bf97",
					strokeWidth: "2",
					strokeLinecap: "round",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M71 52 Q67 45 71 38",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					fill: "none"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "microphoneNotWorking",
		label: "Microphone not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "37",
					y: "40",
					width: "6",
					height: "14",
					rx: "3",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M32 52 Q32 60 40 60 Q48 60 48 52",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "40",
					y1: "60",
					x2: "40",
					y2: "66",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ jsx("line", {
					x1: "36",
					y1: "66",
					x2: "44",
					y2: "66",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				}),
				warnTriangle(55, 24)
			]
		})
	},
	{
		value: "proximitySensorNotWorking",
		label: "Proximity Sensor not working",
		svg: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 80 110",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ jsx("rect", {
					x: "18",
					y: "4",
					width: "44",
					height: "102",
					rx: "7",
					stroke: "#1a2733",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "28",
					y: "9",
					width: "24",
					height: "3",
					rx: "1.5",
					stroke: "#1a2733",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ jsx("rect", {
					x: "22",
					y: "17",
					width: "36",
					height: "76",
					rx: "2",
					stroke: "#d0d8e0",
					strokeWidth: "1",
					fill: "#f8fafc"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "32",
					cy: "13",
					r: "2",
					stroke: "#20bf97",
					strokeWidth: "1.5",
					fill: "#e8f7f3"
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: "32",
					cy: "13",
					r: "0.8",
					fill: "#20bf97"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M26 10 Q22 13 26 16",
					stroke: "#20bf97",
					strokeWidth: "1.2",
					strokeLinecap: "round",
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M23 8 Q17 13 23 18",
					stroke: "#20bf97",
					strokeWidth: "1",
					strokeLinecap: "round",
					fill: "none"
				}),
				warnTriangle(55, 24)
			]
		})
	}
];
var basicFunctionalityQuestions = [
	{
		key: "canMakeCalls",
		label: "Are you able to make or receive calls?"
	},
	{
		key: "touchWorking",
		label: "Is touch screen working properly?"
	},
	{
		key: "displayWorking",
		label: "Is display brightness and color working properly?"
	},
	{
		key: "screenReplaced",
		label: "Has the screen been replaced?"
	}
];
var mobileAgeOptions = [
	{
		value: "below3Months",
		label: "Below 3 months",
		note: "Valid bill mandatory"
	},
	{
		value: "months3To6",
		label: "3 months - 6 months",
		note: "Valid bill mandatory"
	},
	{
		value: "months6To11",
		label: "6 months - 11 months",
		note: "Valid bill mandatory"
	},
	{
		value: "above11Months",
		label: "Above 11 months"
	}
];
function getStoredDeviceDetails() {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(DEVICE_DETAILS_STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
function getStoredSelectedModel() {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(DEVICE_MODEL_STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
function normalizeSlideIndex(index, slideCount) {
	if (typeof index !== "number" || !Number.isFinite(index)) return 0;
	return Math.max(0, Math.min(Math.floor(index), Math.max(0, slideCount - 1)));
}
function toAnswerValue(value) {
	if (value === "yes" || value === "no" || value === "na") return value;
	if (typeof value === "boolean") return value ? "yes" : "no";
}
function toLegacyBoolean(value) {
	if (value === "yes") return true;
	if (value === "no") return false;
	return null;
}
function cleanNestedAnswers(selectedIssues, nestedAnswers) {
	const cleaned = selectedIssues.reduce((cleanedAnswers, issue) => {
		const answer = nestedAnswers[issue];
		if (answer) cleanedAnswers[issue] = answer;
		return cleanedAnswers;
	}, {});
	if (selectedIssues.includes("Scratch/Dent on device body")) {
		if (nestedAnswers["bodyScratches"]) cleaned["bodyScratches"] = nestedAnswers["bodyScratches"];
		if (nestedAnswers["bodyDents"]) cleaned["bodyDents"] = nestedAnswers["bodyDents"];
	}
	if (nestedAnswers["panelCondition"]) cleaned["panelCondition"] = nestedAnswers["panelCondition"];
	if (nestedAnswers["deviceBent"]) cleaned["deviceBent"] = nestedAnswers["deviceBent"];
	return cleaned;
}
function createInitialBasicFunctionality(storedDetails) {
	return {
		canMakeCalls: toAnswerValue(storedDetails?.basicFunctionality?.canMakeCalls ?? storedDetails?.canMakeCalls),
		touchWorking: toAnswerValue(storedDetails?.basicFunctionality?.touchWorking ?? storedDetails?.touchWorking),
		screenReplaced: toAnswerValue(storedDetails?.basicFunctionality?.screenReplaced ?? storedDetails?.screenReplaced),
		displayWorking: toAnswerValue(storedDetails?.basicFunctionality?.displayWorking),
		originalDisplay: toAnswerValue(storedDetails?.basicFunctionality?.originalDisplay)
	};
}
function isAppleDevice(selectedModel) {
	return selectedModel?.brandSlug?.toLowerCase() === "apple";
}
function getFunctionalProblemOptions(isApple) {
	if (!isApple) return functionalProblemOptions;
	return functionalProblemOptions.filter((option) => option.value !== "batteryFaulty");
}
function buildSlideItems() {
	return [
		...basicFunctionalityQuestions.map((question) => ({
			kind: "question",
			group: "basicFunctionality",
			question
		})),
		...issueOptions.map((issue) => ({
			kind: "issue",
			issue
		})),
		{ kind: "bodyDefectDetail" },
		{ kind: "devicePanelDetail" },
		{ kind: "functionalProblemsDetail" },
		{ kind: "mobileAge" },
		{ kind: "accessoriesDetail" }
	];
}
/** Build slides so each group lands on its own slide(s) — issues always isolated. */
function chunkSlideItems(items) {
	const slides = [];
	let currentSlide = [];
	let currentKind = null;
	const flush = () => {
		if (currentSlide.length > 0) {
			slides.push(currentSlide);
			currentSlide = [];
		}
	};
	for (const item of items) {
		const kind = item.kind === "question" ? item.group : item.kind;
		if (kind !== currentKind) {
			flush();
			currentKind = kind;
		}
		if (item.kind !== "issue" && currentSlide.length >= MAX_SLIDE_ITEMS) flush();
		currentSlide.push(item);
	}
	flush();
	return slides;
}
function getSlideTitle(slide) {
	if (slide.some((item) => item.kind === "bodyDefectDetail")) return "Tell us more about your device's body defects?";
	if (slide.some((item) => item.kind === "devicePanelDetail")) return "Device Side/Back Panel & Bent Condition";
	if (slide.some((item) => item.kind === "functionalProblemsDetail")) return "Functional or Physical Problems";
	if (slide.some((item) => item.kind === "mobileAge")) return "What is your mobile age?";
	if (slide.some((item) => item.kind === "accessoriesDetail")) return "Do you have the following?";
	if (slide.some((item) => item.kind === "appleBatteryHealth" || item.kind === "question" && item.group !== "basicFunctionality")) return "Battery & ownership";
	if (slide.some((item) => item.kind === "issue")) return "Condition";
	return "Basics";
}
function getSlideDescription(slide) {
	if (slide.some((item) => item.kind === "bodyDefectDetail")) return "(Because you selected device's body defect)";
	if (slide.some((item) => item.kind === "devicePanelDetail")) return "Check your device's panel condition and physical alignment.";
	if (slide.some((item) => item.kind === "functionalProblemsDetail")) return "Please choose appropriate condition to get accurate quote:";
	if (slide.some((item) => item.kind === "mobileAge")) return "(Because you chose your device is under brand's warranty)";
	if (slide.some((item) => item.kind === "accessoriesDetail")) return "Please select accessories which are available";
	const title = getSlideTitle(slide);
	if (title === "Battery & ownership") return "Battery, charging and documents.";
	if (title === "Condition") return "Select visible issues if any.";
	return "Calls, display and touch.";
}
function AnswerToggleGroup({ name, value, options = ["yes", "no"], onChange }) {
	const answerLabels = {
		yes: "Yes",
		no: "No",
		na: "Not applicable"
	};
	return /* @__PURE__ */ jsx("div", {
		className: "user-radio-group",
		children: options.map((option) => /* @__PURE__ */ jsxs("label", {
			className: `user-radio-label${value === option ? " selected" : ""}`,
			children: [
				/* @__PURE__ */ jsx("input", {
					type: "radio",
					name,
					value: option,
					checked: value === option,
					onChange: () => onChange(option)
				}),
				/* @__PURE__ */ jsx("span", { className: "user-radio-mark" }),
				/* @__PURE__ */ jsx("span", {
					className: "user-radio-text",
					children: answerLabels[option]
				})
			]
		}, option))
	});
}
function AppleBatteryHealthGroup({ value, onChange }) {
	return /* @__PURE__ */ jsxs("fieldset", {
		className: "user-battery-health-group",
		children: [/* @__PURE__ */ jsx("legend", { children: "Battery health" }), /* @__PURE__ */ jsx("div", {
			className: "user-battery-health-options",
			children: [
				{
					value: "above95",
					label: "Above 95%"
				},
				{
					value: "above85",
					label: "Above 85%"
				},
				{
					value: "at80",
					label: "80%"
				}
			].map((option) => /* @__PURE__ */ jsxs("label", {
				className: `user-battery-health-option${value === option.value ? " selected" : ""}`,
				children: [/* @__PURE__ */ jsx("input", {
					type: "radio",
					name: "appleBatteryHealth",
					value: option.value,
					checked: value === option.value,
					onChange: () => onChange(option.value)
				}), /* @__PURE__ */ jsx("span", { children: option.label })]
			}, option.value))
		})]
	});
}
function UserSellPhoneDeviceDetailsPage() {
	const [isHydrated, setIsHydrated] = useState(false);
	const [storedDetails, setStoredDetails] = useState(null);
	const [storedSelectedModel, setStoredSelectedModel] = useState(null);
	const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
	const [basicFunctionality, setBasicFunctionality] = useState({});
	const [selectedIssues, setSelectedIssues] = useState([]);
	const [nestedPhysicalIssueAnswers, setNestedPhysicalIssueAnswers] = useState({});
	const [batteryAndCharging, setBatteryAndCharging] = useState({});
	const [accessoriesAndOwnership, setAccessoriesAndOwnership] = useState({});
	const [appleBatteryHealth, setAppleBatteryHealth] = useState();
	const [mobileAge, setMobileAge] = useState();
	const [functionalProblems, setFunctionalProblems] = useState([]);
	const [accessories, setAccessories] = useState([]);
	useEffect(() => {
		const details = getStoredDeviceDetails();
		const selectedModel = getStoredSelectedModel();
		isAppleDevice(selectedModel);
		details?.physicalIssues ?? details?.selectedIssues;
		const initialSlides = chunkSlideItems(buildSlideItems());
		const restoredSlide = details?.questionnaireSlide ?? (typeof details?.detailStep === "number" ? details.detailStep - 1 : 0);
		setStoredDetails(details);
		setStoredSelectedModel(selectedModel);
		setBasicFunctionality(createInitialBasicFunctionality(details));
		setSelectedIssues(details?.physicalIssues ?? details?.selectedIssues ?? []);
		setNestedPhysicalIssueAnswers(details?.nestedPhysicalIssueAnswers ?? {});
		setBatteryAndCharging(details?.batteryAndCharging ?? {});
		setAccessoriesAndOwnership(details?.accessoriesAndOwnership ?? {});
		setAppleBatteryHealth(details?.appleBatteryHealth);
		setMobileAge(details?.mobileAge);
		setFunctionalProblems(details?.functionalProblems ?? []);
		setAccessories(details?.accessories ?? []);
		setCurrentSlideIndex(normalizeSlideIndex(restoredSlide, initialSlides.length));
		setIsHydrated(true);
	}, []);
	const isApple = isAppleDevice(storedSelectedModel);
	const slides = chunkSlideItems(buildSlideItems());
	const functionalProblemOptionsForDevice = getFunctionalProblemOptions(isApple);
	const activeSlideIndex = normalizeSlideIndex(currentSlideIndex, slides.length);
	const activeSlide = slides[activeSlideIndex] ?? [];
	const isLastSlide = activeSlideIndex === slides.length - 1;
	const answerMaps = {
		basicFunctionality,
		batteryAndCharging,
		accessoriesAndOwnership
	};
	const updateAnswerMap = (group, updater) => {
		if (group === "basicFunctionality") setBasicFunctionality(updater);
		if (group === "batteryAndCharging") setBatteryAndCharging(updater);
		if (group === "accessoriesAndOwnership") setAccessoriesAndOwnership(updater);
	};
	const persistDeviceDetails = (slideIndex = activeSlideIndex, issues = selectedIssues, nextBatteryAnswers = batteryAndCharging, nextAppleBatteryHealth = appleBatteryHealth, nextMobileAge = mobileAge, nextNestedAnswers = nestedPhysicalIssueAnswers, nextFunctionalProblems = functionalProblems, nextAccessories = accessories) => {
		if (typeof window === "undefined") return null;
		const cleanIssueAnswers = cleanNestedAnswers(issues, nextNestedAnswers);
		const details = {
			canMakeCalls: toLegacyBoolean(basicFunctionality.canMakeCalls),
			touchWorking: toLegacyBoolean(basicFunctionality.touchWorking),
			screenReplaced: toLegacyBoolean(basicFunctionality.screenReplaced),
			selectedIssues: issues,
			detailStep: Math.min(slideIndex + 1, 3),
			questionnaireSlide: slideIndex,
			basicFunctionality,
			physicalIssues: issues,
			nestedPhysicalIssueAnswers: cleanIssueAnswers,
			cameraAndBiometrics: storedDetails?.cameraAndBiometrics ?? {},
			sensorsAndConnectivity: storedDetails?.sensorsAndConnectivity ?? {},
			batteryAndCharging: nextBatteryAnswers,
			accessoriesAndOwnership,
			appleBatteryHealth: isApple ? nextAppleBatteryHealth : void 0,
			mobileAge: nextMobileAge,
			functionalProblems: nextFunctionalProblems,
			accessories: nextAccessories,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		window.localStorage.setItem(DEVICE_DETAILS_STORAGE_KEY, JSON.stringify(details));
		return details;
	};
	useEffect(() => {
		if (!isApple || !functionalProblems.includes("batteryFaulty")) return;
		const updatedFunctionalProblems = functionalProblems.filter((problem) => problem !== "batteryFaulty");
		setFunctionalProblems(updatedFunctionalProblems);
		persistDeviceDetails(activeSlideIndex, selectedIssues, batteryAndCharging, appleBatteryHealth, mobileAge, nestedPhysicalIssueAnswers, updatedFunctionalProblems, accessories);
	}, [
		isApple,
		functionalProblems,
		activeSlideIndex,
		selectedIssues,
		batteryAndCharging,
		appleBatteryHealth,
		mobileAge,
		nestedPhysicalIssueAnswers,
		accessories
	]);
	if (!isHydrated) return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell user-device-details-shell",
			children: [/* @__PURE__ */ jsx("div", {
				className: "user-auth-brand",
				children: "Device Details"
			}), /* @__PURE__ */ jsx("h1", { children: "Loading questionnaire..." })]
		})
	});
	const moveToSlide = (nextSlideIndex) => {
		const normalizedIndex = normalizeSlideIndex(nextSlideIndex, slides.length);
		persistDeviceDetails(normalizedIndex);
		setCurrentSlideIndex(normalizedIndex);
		if (typeof window !== "undefined") window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	const toggleIssue = (issue) => {
		setSelectedIssues((previousIssues) => {
			const nextIssues = previousIssues.includes(issue) ? previousIssues.filter((selectedIssue) => selectedIssue !== issue) : [...previousIssues, issue];
			persistDeviceDetails(activeSlideIndex, nextIssues);
			return nextIssues;
		});
	};
	const updateAppleBatteryHealth = (value) => {
		const nextBatteryAnswers = {
			...batteryAndCharging,
			batteryServiceMode: value === "at80" ? "yes" : "no"
		};
		setAppleBatteryHealth(value);
		setBatteryAndCharging(nextBatteryAnswers);
		persistDeviceDetails(activeSlideIndex, selectedIssues, nextBatteryAnswers, value);
		if (value === "at80") toast.warning("Battery in service mode");
	};
	const updateMobileAge = (value) => {
		setMobileAge(value);
		persistDeviceDetails(activeSlideIndex, selectedIssues, batteryAndCharging, appleBatteryHealth, value, nestedPhysicalIssueAnswers);
	};
	const completeFinalStep = () => {
		const details = persistDeviceDetails(activeSlideIndex);
		if (typeof window === "undefined" || !details) return;
		toast.success("Phone details saved.");
		window.location.href = "/user/sell-phone/quote";
	};
	const isSlideComplete = activeSlide.every((item) => {
		if (item.kind === "issue") return true;
		if (item.kind === "bodyDefectDetail") return Boolean(nestedPhysicalIssueAnswers["bodyScratches"] && nestedPhysicalIssueAnswers["bodyDents"]);
		if (item.kind === "devicePanelDetail") return Boolean(nestedPhysicalIssueAnswers["panelCondition"] && nestedPhysicalIssueAnswers["deviceBent"]);
		if (item.kind === "functionalProblemsDetail") return true;
		if (item.kind === "mobileAge") return Boolean(mobileAge);
		if (item.kind === "accessoriesDetail") return true;
		if (item.kind === "appleBatteryHealth") return Boolean(appleBatteryHealth);
		return Boolean(answerMaps[item.group][item.question.key]);
	});
	const progressItems = slides.flat().filter((item) => item.kind !== "issue" && item.kind !== "bodyDefectDetail" && item.kind !== "devicePanelDetail" && item.kind !== "functionalProblemsDetail" && item.kind !== "accessoriesDetail");
	const answeredCount = progressItems.filter((item) => {
		if (item.kind === "appleBatteryHealth") return Boolean(appleBatteryHealth);
		if (item.kind === "mobileAge") return Boolean(mobileAge);
		if (item.kind === "bodyDefectDetail") return false;
		return Boolean(answerMaps[item.group][item.question.key]);
	}).length;
	const totalRequiredCount = progressItems.length;
	const progressPercent = totalRequiredCount > 0 ? Math.round(answeredCount / totalRequiredCount * 100) : 0;
	const renderSlideItem = (item) => {
		if (item.kind === "issue") {
			const selected = selectedIssues.includes(item.issue);
			const icon = issueIcons[item.issue];
			return /* @__PURE__ */ jsxs("button", {
				type: "button",
				className: `user-issue-img-tile${selected ? " selected" : ""}`,
				onClick: () => toggleIssue(item.issue),
				"aria-pressed": selected,
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "user-issue-img-wrap",
						children: icon
					}),
					/* @__PURE__ */ jsx("span", {
						className: "user-issue-img-label",
						children: item.issue
					}),
					selected && /* @__PURE__ */ jsx("span", {
						className: "user-issue-img-check",
						children: "✓"
					})
				]
			}, `issue-${item.issue}`);
		}
		if (item.kind === "appleBatteryHealth") return /* @__PURE__ */ jsx(AppleBatteryHealthGroup, {
			value: appleBatteryHealth,
			onChange: updateAppleBatteryHealth
		}, "appleBatteryHealth");
		if (item.kind === "bodyDefectDetail") {
			const currentScratches = nestedPhysicalIssueAnswers["bodyScratches"];
			const currentDents = nestedPhysicalIssueAnswers["bodyDents"];
			const updateBodyDefect = (key, value) => {
				const updated = {
					...nestedPhysicalIssueAnswers,
					[key]: value
				};
				setNestedPhysicalIssueAnswers(updated);
				persistDeviceDetails(activeSlideIndex, selectedIssues, batteryAndCharging, appleBatteryHealth, updated);
			};
			return /* @__PURE__ */ jsxs("div", {
				className: "user-body-defect-detail",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "user-body-defect-section",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "user-body-defect-section-header",
						children: [/* @__PURE__ */ jsx("h3", { children: "1. Scratches on device Body" }), /* @__PURE__ */ jsx("p", { children: "Check for scratches on device body" })]
					}), /* @__PURE__ */ jsx("div", {
						className: "user-issue-img-grid",
						children: scratchOptions.map((opt) => /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: `user-issue-img-tile${currentScratches === opt.value ? " selected" : ""}`,
							onClick: () => updateBodyDefect("bodyScratches", opt.value),
							"aria-pressed": currentScratches === opt.value,
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "user-issue-img-wrap",
									children: opt.svg
								}),
								/* @__PURE__ */ jsx("span", {
									className: "user-issue-img-label",
									children: opt.label
								}),
								currentScratches === opt.value && /* @__PURE__ */ jsx("span", {
									className: "user-issue-img-check",
									children: "✓"
								})
							]
						}, opt.value))
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "user-body-defect-section",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "user-body-defect-section-header",
						children: [/* @__PURE__ */ jsx("h3", { children: "2. Dents on device Body" }), /* @__PURE__ */ jsx("p", { children: "Check for dents on device body" })]
					}), /* @__PURE__ */ jsx("div", {
						className: "user-issue-img-grid",
						children: dentOptions.map((opt) => /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: `user-issue-img-tile${currentDents === opt.value ? " selected" : ""}`,
							onClick: () => updateBodyDefect("bodyDents", opt.value),
							"aria-pressed": currentDents === opt.value,
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "user-issue-img-wrap",
									children: opt.svg
								}),
								/* @__PURE__ */ jsx("span", {
									className: "user-issue-img-label",
									children: opt.label
								}),
								currentDents === opt.value && /* @__PURE__ */ jsx("span", {
									className: "user-issue-img-check",
									children: "✓"
								})
							]
						}, opt.value))
					})]
				})]
			}, "bodyDefectDetail");
		}
		if (item.kind === "devicePanelDetail") {
			const currentPanel = nestedPhysicalIssueAnswers["panelCondition"];
			const currentBent = nestedPhysicalIssueAnswers["deviceBent"];
			const updatePanelDetail = (key, value) => {
				const updated = {
					...nestedPhysicalIssueAnswers,
					[key]: value
				};
				setNestedPhysicalIssueAnswers(updated);
				persistDeviceDetails(activeSlideIndex, selectedIssues, batteryAndCharging, appleBatteryHealth, updated);
			};
			return /* @__PURE__ */ jsxs("div", {
				className: "user-body-defect-detail",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "user-body-defect-section",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "user-body-defect-section-header",
						children: [/* @__PURE__ */ jsx("h3", { children: "1. Device Side/Back Panel Condition" }), /* @__PURE__ */ jsx("p", { children: "Check your device's side & back panels" })]
					}), /* @__PURE__ */ jsx("div", {
						className: "user-issue-img-grid",
						children: panelConditionOptions.map((opt) => /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: `user-issue-img-tile${currentPanel === opt.value ? " selected" : ""}`,
							onClick: () => updatePanelDetail("panelCondition", opt.value),
							"aria-pressed": currentPanel === opt.value,
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "user-issue-img-wrap",
									children: opt.svg
								}),
								/* @__PURE__ */ jsx("span", {
									className: "user-issue-img-label",
									children: opt.label
								}),
								currentPanel === opt.value && /* @__PURE__ */ jsx("span", {
									className: "user-issue-img-check",
									children: "✓"
								})
							]
						}, opt.value))
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "user-body-defect-section",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "user-body-defect-section-header",
						children: [/* @__PURE__ */ jsx("h3", { children: "2. Device Bent/Screen loose" }), /* @__PURE__ */ jsx("p", { children: "Check if your device is bent or display screen is loose" })]
					}), /* @__PURE__ */ jsx("div", {
						className: "user-issue-img-grid",
						children: deviceBentOptions.map((opt) => /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: `user-issue-img-tile${currentBent === opt.value ? " selected" : ""}`,
							onClick: () => updatePanelDetail("deviceBent", opt.value),
							"aria-pressed": currentBent === opt.value,
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "user-issue-img-wrap",
									children: opt.svg
								}),
								/* @__PURE__ */ jsx("span", {
									className: "user-issue-img-label",
									children: opt.label
								}),
								currentBent === opt.value && /* @__PURE__ */ jsx("span", {
									className: "user-issue-img-check",
									children: "✓"
								})
							]
						}, opt.value))
					})]
				})]
			}, "devicePanelDetail");
		}
		if (item.kind === "functionalProblemsDetail") {
			const toggleFunctionalProblem = (value) => {
				const updated = functionalProblems.includes(value) ? functionalProblems.filter((p) => p !== value) : [...functionalProblems, value];
				setFunctionalProblems(updated);
				persistDeviceDetails(activeSlideIndex, selectedIssues, batteryAndCharging, appleBatteryHealth, nestedPhysicalIssueAnswers, updated);
			};
			return /* @__PURE__ */ jsx("div", {
				className: "user-issue-img-grid user-functional-problems-grid",
				children: functionalProblemOptionsForDevice.map((opt) => {
					const selected = functionalProblems.includes(opt.value);
					return /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: `user-issue-img-tile${selected ? " selected" : ""}`,
						onClick: () => toggleFunctionalProblem(opt.value),
						"aria-pressed": selected,
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "user-issue-img-wrap",
								children: opt.svg
							}),
							/* @__PURE__ */ jsx("span", {
								className: "user-issue-img-label",
								children: opt.label
							}),
							selected && /* @__PURE__ */ jsx("span", {
								className: "user-issue-img-check",
								children: "✓"
							})
						]
					}, opt.value);
				})
			}, "functionalProblemsDetail");
		}
		if (item.kind === "accessoriesDetail") {
			const toggleAccessory = (value) => {
				const updated = accessories.includes(value) ? accessories.filter((a) => a !== value) : [...accessories, value];
				setAccessories(updated);
				persistDeviceDetails(activeSlideIndex, selectedIssues, batteryAndCharging, appleBatteryHealth, mobileAge, nestedPhysicalIssueAnswers, functionalProblems, updated);
			};
			return /* @__PURE__ */ jsx("div", {
				className: "user-accessories-grid",
				children: accessoryOptions.map((opt) => {
					const selected = accessories.includes(opt.value);
					return /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: `user-issue-img-tile user-accessory-tile${selected ? " selected" : ""}`,
						onClick: () => toggleAccessory(opt.value),
						"aria-pressed": selected,
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "user-accessory-img-wrap",
								children: opt.svg
							}),
							/* @__PURE__ */ jsx("span", {
								className: "user-issue-img-label",
								children: opt.label
							}),
							selected && /* @__PURE__ */ jsx("span", {
								className: "user-issue-img-check",
								children: "✓"
							})
						]
					}, opt.value);
				})
			}, "accessoriesDetail");
		}
		if (item.kind === "mobileAge") return /* @__PURE__ */ jsxs("fieldset", {
			className: "user-mobile-age-group",
			children: [/* @__PURE__ */ jsx("legend", { children: "What is your mobile age?" }), /* @__PURE__ */ jsx("div", {
				className: "user-mobile-age-options",
				children: mobileAgeOptions.map((option) => {
					const selected = mobileAge === option.value;
					return /* @__PURE__ */ jsxs("label", {
						className: `user-mobile-age-option${selected ? " selected" : ""}`,
						children: [
							/* @__PURE__ */ jsx("input", {
								type: "radio",
								name: "mobileAge",
								value: option.value,
								checked: selected,
								onChange: () => updateMobileAge(option.value)
							}),
							/* @__PURE__ */ jsx("span", {
								className: "user-mobile-age-mark",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ jsxs("span", {
								className: "user-mobile-age-copy",
								children: [/* @__PURE__ */ jsx("span", {
									className: "user-mobile-age-label",
									children: option.label
								}), option.note && /* @__PURE__ */ jsx("span", {
									className: "user-mobile-age-note",
									children: option.note
								})]
							})
						]
					}, option.value);
				})
			})]
		}, "mobileAge");
		return /* @__PURE__ */ jsxs("article", {
			className: "user-question-card",
			children: [/* @__PURE__ */ jsx("h3", { children: item.question.label }), /* @__PURE__ */ jsx(AnswerToggleGroup, {
				name: `${item.group}-${item.question.key}`,
				value: answerMaps[item.group][item.question.key],
				options: item.question.options,
				onChange: (answer) => updateAnswerMap(item.group, (previousAnswers) => ({
					...previousAnswers,
					[item.question.key]: answer
				}))
			})]
		}, `${item.group}-${item.question.key}`);
	};
	return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell user-device-details-shell",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "user-auth-brand",
					children: "Device Details"
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "user-question-progress",
					"aria-label": "Device questionnaire progress",
					children: [/* @__PURE__ */ jsx("div", {
						className: "user-question-progress-copy",
						children: /* @__PURE__ */ jsxs("span", { children: [
							"Slide ",
							activeSlideIndex + 1,
							" of ",
							slides.length
						] })
					}), /* @__PURE__ */ jsx("div", {
						className: "user-question-progress-bar",
						"aria-hidden": "true",
						children: /* @__PURE__ */ jsx("div", {
							className: "user-question-progress-fill",
							style: { width: `${progressPercent}%` }
						})
					})]
				}),
				/* @__PURE__ */ jsxs("section", {
					className: "user-questionnaire-block user-question-slide",
					"aria-label": getSlideTitle(activeSlide),
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "user-questionnaire-heading",
							children: [/* @__PURE__ */ jsx("h2", { children: getSlideTitle(activeSlide) }), /* @__PURE__ */ jsx("p", { children: getSlideDescription(activeSlide) })]
						}),
						/* @__PURE__ */ jsx("div", {
							className: activeSlide.some((item) => item.kind === "bodyDefectDetail" || item.kind === "devicePanelDetail" || item.kind === "functionalProblemsDetail" || item.kind === "accessoriesDetail") ? "user-body-defect-wrap" : activeSlide.some((item) => item.kind === "issue") && activeSlide.every((item) => item.kind === "issue") ? "user-issue-img-grid" : "user-slide-item-grid",
							children: activeSlide.map(renderSlideItem)
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "user-auth-actions user-question-actions",
							children: [activeSlideIndex === 0 ? /* @__PURE__ */ jsx(Link, {
								to: "/user/sell-phone",
								className: "user-auth-cancel user-inline-link",
								children: "Back"
							}) : /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-cancel",
								onClick: () => moveToSlide(activeSlideIndex - 1),
								children: "Back"
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-submit",
								style: {
									display: "inline-flex",
									alignItems: "center",
									gap: "6px"
								},
								disabled: !isSlideComplete,
								onClick: isLastSlide ? completeFinalStep : () => moveToSlide(activeSlideIndex + 1),
								children: isLastSlide ? "Continue to Quote" : /* @__PURE__ */ jsxs(Fragment, { children: ["Continue ", /* @__PURE__ */ jsx(ArrowRight, { size: 16 })] })
							})]
						}),
						storedSelectedModel?.modelName && /* @__PURE__ */ jsxs("div", {
							className: "user-device-model-info",
							children: [/* @__PURE__ */ jsx("span", {
								className: "user-device-model-label",
								children: "Device Details"
							}), /* @__PURE__ */ jsxs("span", {
								className: "user-device-model-name",
								children: ["Selected Model: ", storedSelectedModel.modelName]
							})]
						})
					]
				})
			]
		})
	});
}
//#endregion
export { UserSellPhoneDeviceDetailsPage as component };
