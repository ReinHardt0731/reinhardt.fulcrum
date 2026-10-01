const t = (title, detail, reference = "") => ({ title, detail, reference });

const weeks = [
    {
        subject: "Mathematics",
        formulaSubject: "Mathematics",
        days: [
            [t("Timed mock exam", "Take the next mock exam set under time. Check it, redo every wrong item, and log it.", "Math mock exams"), t("Maxima & minima", "Solve optimization problems: largest area, least cost, shortest distance. Set up the function, differentiate, and check endpoints."), t("Repeat an earlier mock", "Re-answer an earlier set, starting from Set 1. Check it and log anything missed again.", "Math mock exams")],
            [t("Timed mock exam", "Take the next mock exam set under time. Check it, redo every wrong item, and log it.", "Math mock exams"), t("Related rates", "Work ladders, tanks, shadows, and moving objects. Draw each situation, label rates, and differentiate with respect to time."), t("Repeat an earlier mock", "Re-answer an earlier set, starting from Set 1. Check it and log anything missed again.", "Math mock exams")],
            [t("Timed mock exam", "Take the next mock exam set under time. Check it, redo every wrong item, and log it.", "Math mock exams"), t("Areas & volumes", "Practice areas between curves and volumes of revolution using disk, washer, and shell methods."), t("Repeat an earlier mock", "Re-answer an earlier set, starting from Set 1. Check it and log anything missed again.", "Math mock exams")],
            [t("Timed mock exam", "Take the next mock exam set under time. Check it, redo every wrong item, and log it.", "Math mock exams"), t("Work, fluid force & centroids", "Practice pumping work, springs, fluid force on plates, centroids, and moments of inertia by integration."), t("Repeat an earlier mock", "Re-answer an earlier set, starting from Set 1. Check it and log anything missed again.", "Math mock exams")],
            [t("Timed mock exam", "Take the next mock exam set under time. Check it, redo every wrong item, and log it.", "Math mock exams"), t("Motion & time rates", "Practice position, velocity, acceleration, distance traveled, and rates of change over time."), t("Repeat an earlier mock", "Re-answer an earlier set, starting from Set 1. Check it and log anything missed again.", "Math mock exams")],
            [t("Timed mock exam", "Take the next mock exam set under time. Check it, redo every wrong item, and log it.", "Math mock exams"), t("Differential equations", "Practice growth and decay, Newton’s law of cooling, mixing tanks, and first-order linear differential equations."), t("Repeat an earlier mock", "Re-answer an earlier set, starting from Set 1. Check it and log anything missed again.", "Math mock exams")],
            [t("Timed mock exam", "Take the next mock exam set under time. Check it, redo every wrong item, and log it.", "Math mock exams"), t("Mixed timed set", "Mix every calculus type from this week. Redo each missed problem right away."), t("Rest evening", "Take the evening off. Optional: spend 15 minutes flipping through this week’s error log.")]
        ]
    },
    {
        subject: "Aerodynamics",
        formulaSubject: "Aerodynamics",
        days: [
            [t("Theory: atmosphere & flight", "Read ISA layers, lapse rate, pressure/density ratios and altitude, and how heavier- and lighter-than-air craft fly.", "Principles of Flight PDF"), t("Plates: atmosphere", "Solve temperature, pressure, and density at altitude, plus pressure and density altitude problems.", "Aero plates"), t("Theory: fluid laws & airspeed", "Review continuity, Bernoulli, compressible flow, pitot-static systems, and IAS/CAS/EAS/TAS.", "Principles of Flight PDF")],
            [t("Plates: fluid laws & airspeed", "Solve venturi and pitot-tube problems and airspeed conversions.", "Aero plates"), t("Theory: compressible flow", "Review Mach number, speed of sound, isentropic relations, and stagnation properties.", "Principles of Flight PDF"), t("Plates: compressible flow", "Solve Mach, stagnation temperature and pressure, and isentropic relation problems.", "Aero plates")],
            [t("Theory: airfoils & finite wings", "Review airfoil nomenclature, NACA series, lift/drag/moment coefficients, stall, aspect ratio, induced drag, Oswald efficiency, drag polar, and high-lift devices.", "Principles of Flight PDF"), t("Plates: lift, drag & moment", "Solve coefficient and Reynolds number problems, including moments about the aerodynamic center and center of pressure.", "Aero plates"), t("Plates: induced drag", "Solve aspect-ratio corrections, induced drag, maximum L/D, and minimum-drag speed problems.", "Aero plates")],
            [t("Theory: performance", "Review thrust and power required/available, climb, ceilings, glide ratio, and minimum sink.", "Principles of Flight PDF"), t("Plates: performance", "Solve minimum-drag and minimum-power speeds, climb, ceiling, and glide-distance problems.", "Aero plates"), t("Theory: range & takeoff", "Review Breguet range and endurance for propeller and jet aircraft, plus takeoff and landing ground roll.", "Principles of Flight PDF")],
            [t("Plates: range & landing", "Solve Breguet range/endurance, best-range/endurance speeds, and takeoff/landing distances.", "Aero plates"), t("Theory: turns & V-n", "Review level turns, load factor, stall speed in a turn, maneuvering and gust loads, and the flight envelope.", "Principles of Flight PDF"), t("Plates: turns & load factor", "Solve turn radius/rate, bank angle, stall speed in turns, V-n limits, and gust load factor.", "Aero plates")],
            [t("Theory: stability & control", "Review static/dynamic stability, neutral point, static margin, lateral/directional stability, control surfaces, and tabs.", "Principles of Flight PDF"), t("Plates: stability & control", "Solve moments about CG, neutral point, static margin, tail volume coefficient, and trim.", "Aero plates"), t("Theory: high-speed flow", "Review critical Mach, normal/oblique shocks, expansion waves, supersonic airfoils, and wind tunnels.", "Principles of Flight PDF")],
            [t("Plates: shocks & wind tunnels", "Solve normal/oblique shock relations, isentropic tables, and wind-tunnel test-section problems.", "Aero plates"), t("Helicopters & lighter-than-air", "Read and solve rotor thrust/torque, disc loading, induced velocity, autorotation, retreating-blade stall, and airship/balloon buoyancy.", "Principles of Flight PDF · Aero plates"), t("Rest evening", "Take the evening off. Optional: spend 15 minutes flipping through this week’s error log.")]
        ]
    },
    {
        subject: "Structures & Powerplant",
        formulaSubject: "Structures",
        formulas: ["Write the Structures formulas from memory, check, and re-drill misses.", "Write the Structures formulas from memory, check, and re-drill misses.", "Write the Structures formulas from memory, check, and re-drill misses.", "Write the Structures formulas from memory, check, and re-drill misses.", "Write the Powerplant formulas from memory, check, and re-drill misses.", "Write the Powerplant formulas from memory, check, and re-drill misses.", "Write the Powerplant formulas from memory, check, and re-drill misses."],
        days: [
            [t("Perry: stress fundamentals", "Review stress, strain, Hooke’s law, allowable stress, factor and margin of safety, and the stress-analysis procedure.", "Perry, Aircraft Structures"), t("Perry: beams", "Practice shear and bending-moment diagrams, bending stress, centroids, and moments of inertia.", "Perry, Aircraft Structures"), t("Perry: torsion", "Review torsion of shafts and thin-walled closed sections, including shear flow.", "Perry, Aircraft Structures")],
            [t("Perry: columns", "Review Euler and Johnson columns, slenderness ratio, and end fixity.", "Perry, Aircraft Structures"), t("Perry: trusses", "Practice truss analysis, determinate/indeterminate systems, and combined stresses.", "Perry, Aircraft Structures"), t("Teichmann: design requirements", "Review aircraft categories, specifications, and aircraft utilization.", "Teichmann, Airplane Design Manual")],
            [t("Teichmann: flight loads", "Review V-n diagrams, maneuver/gust load factors, design speeds, and flight envelope.", "Teichmann, Airplane Design Manual"), t("Teichmann: wing & fuselage loads", "Review load distribution on wings, fuselage, and control surfaces.", "Teichmann, Airplane Design Manual"), t("Teichmann: landing gear & engine mounts", "Review landing loads, engine-mount loads, and other structural members.", "Teichmann, Airplane Design Manual")],
            [t("Raymer: design configuration", "Review aircraft parts and systems, structural configuration, and wing geometry: MAC, taper, and sweep.", "Raymer, Aircraft Design"), t("Raymer: weight & CG", "Review weight estimation/distribution, CG location, and CG travel.", "Raymer, Aircraft Design"), t("Structures sweep", "Re-read highlights from Perry, Teichmann, and Raymer; finish the Structures formula sheet.", "Summarized copies")],
            [t("Reciprocating engines", "Take one mock set, then study engine theory/components, Otto cycle, displacement, compression ratio, IHP/BHP/FHP, and mechanical efficiency.", "Powerplant mocks · Prepware"), t("Gas turbines", "Study the Brayton cycle, thrust equation, propulsive/thermal efficiency, and TSFC.", "Powerplant mocks · Prepware"), t("Propellers", "Study blade angle, pitch, propeller efficiency, thrust horsepower, and governors.", "Powerplant mocks · Prepware")],
            [t("Fuel, induction & cooling", "Take one mock set, then study fuel metering/carburetion, fuel systems, induction, and cooling.", "Powerplant mocks · Prepware"), t("Lubrication, ignition & starting", "Study oil systems, magnetos/ignition, and starters.", "Powerplant mocks · Prepware"), t("Instruments & fire protection", "Study engine instruments, fire detection/extinguishing, exhaust/reversers, and engine inspection.", "Powerplant mocks · Prepware")],
            [t("Repeat Powerplant mocks", "Re-answer your mock exam sets under time and log every miss.", "Powerplant mocks · Prepware"), t("Prepware missed items", "Clear every Prepware item missed this week.", "Prepware"), t("Rest evening", "Take the evening off. Optional: spend 15 minutes flipping through this week’s error log.")]
        ]
    },
    {
        subject: "ACRM & Air Laws",
        formulaSubject: "ACRM weight & balance",
        formulas: ["Write the ACRM weight and balance formulas from memory, check, and re-drill misses.", "Write the ACRM weight and balance formulas from memory, check, and re-drill misses.", "Write the ACRM weight and balance formulas from memory, check, and re-drill misses.", "Write the ACRM weight and balance formulas from memory, check, and re-drill misses.", "Write Engineering Economy formulas from memory, check, and re-drill misses.", "Write Engineering Economy formulas from memory, check, and re-drill misses.", "Write Engineering Economy formulas from memory, check, and re-drill misses."],
        days: [
            [t("Metals & identification", "Read 1Aero, then answer Prepware on ferrous/non-ferrous metals, alloys, and metal identification.", "1Aero · Prepware"), t("Heat treatment, forming & joining", "Read 1Aero, then study heat treatment, forming, forging, welding, and other joining methods.", "1Aero · Prepware"), t("Aircraft hardware", "Read 1Aero, then study bolts, nuts, screws, washers, rivets, and hardware identification.", "1Aero · Prepware")],
            [t("Control cables & tools", "Read 1Aero, then study control cables, cable assemblies, tools, and fabrication equipment.", "1Aero · Prepware"), t("Metal structure repair", "Study sheet-metal repair, rivet layout, and bend allowance.", "1Aero · Prepware"), t("Structural components", "Study construction of wings, fuselage, and other structural components.", "1Aero · Prepware")],
            [t("Wood, fabric & fiberglass", "Study non-metal structures: wood, fabric covering, and fiberglass.", "1Aero · Prepware"), t("Composite materials", "Study composite construction, inspection, and repair.", "1Aero · Prepware"), t("Hardness testing", "Review Brinell, Rockwell, and other hardness tests.", "1Aero · Prepware")],
            [t("Non-destructive testing", "Study dye penetrant, magnetic particle, eddy current, ultrasonic, and radiographic inspection.", "1Aero · Prepware"), t("Corrosion", "Review corrosion types, protection, and removal.", "1Aero · Prepware"), t("Weight & balance", "Review weighing procedure and CG computations; check forward/aft CG limits and solve at least five problems.", "1Aero · Prepware")],
            [t("PD 1570 deck", "Review Aeronautical Engineering Law: definitions, the Board, registration, and practice.", "Air Law flashcards"), t("IRR & Code of Ethics", "Review the implementing rules and Code of Professional Ethics.", "Air Law flashcards"), t("RA 776 & RA 9497", "Review the Civil Aeronautics Act and Civil Aviation Authority Act.", "Air Law flashcards")],
            [t("Full flashcard shuffle", "Run every deck shuffled and set aside every card missed.", "Air Law flashcards"), t("Missed pile", "Repeat the missed pile until it is empty.", "Air Law flashcards"), t("Timed full shuffle", "Run every deck again and answer each card in under 10 seconds.", "Air Law flashcards")],
            [t("Final missed-card pass", "Clear the missed pile one last time.", "Air Law flashcards"), t("ACRM missed items", "Clear every Prepware item missed this week.", "1Aero · Prepware"), t("Rest evening", "Take the evening off. Optional: spend 15 minutes flipping through this week’s error log.")]
        ]
    },
    {
        subject: "Math & Aero final review",
        formulas: [
            "Write the Mathematics formulas from memory, check, and re-drill misses.",
            "Write the Aerodynamics formulas from memory, check, and re-drill misses.",
            "Write the Mathematics formulas from memory, check, and re-drill misses.",
            "Write the Aerodynamics formulas from memory, check, and re-drill misses.",
            "Write the Mathematics formulas from memory, check, and re-drill misses.",
            "Write formulas for your weakest subject from memory, then check and re-drill misses.",
            "Calmly read every formula sheet once; no writing drill today."
        ],
        days: [
            [t("Timed Math mock", "Repeat mock sets in order from Set 1. Check each one, redo wrong items, and log them.", "Math mock exams"), t("Optimization & related rates", "Redo logged misses on both types, then solve ten fresh problems."), t("Integration & DE applications", "Review areas, volumes, work, centroids, growth/decay, cooling, and mixing. Redo logged misses first.")],
            [t("Redo Aero plates: atmosphere to wings", "Re-solve misses on atmosphere, fluid laws, compressible flow, airfoils, and finite wings.", "Aero plates"), t("Redo Aero performance plates", "Re-solve misses on power, climb, glide, turns, load factor, takeoff, landing, range, and endurance.", "Aero plates"), t("Final Aero theory: first half", "Read Principles of Flight highlights from atmosphere through performance.", "Principles of Flight PDF")],
            [t("Continue timed Math mock pass", "Continue re-answering mock sets in order; check, correct, and log misses.", "Math mock exams"), t("Calculus error log", "Work through every calculus word problem in your error log."), t("Lowest-scoring mock", "Re-answer your lowest-scoring set under time.", "Math mock exams")],
            [t("Mixed timed Aero set", "Solve one timed problem per topic. Flag any problem taking over three minutes and review the method.", "Aero plates"), t("Redo Aero plates: stability to helicopters", "Re-solve misses on stability/control, shocks, wind tunnels, helicopters, and lighter-than-air topics.", "Aero plates"), t("Final Aero theory: second half", "Read highlights on stability/control, high-speed flow, wind tunnels, and helicopters.", "Principles of Flight PDF")],
            [t("Last full Math mock", "Take one full set under exam conditions: timed, no notes, and no breaks.", "Math mock exams"), t("Last mixed Aero set", "Solve a short timed set across all topics and redo every miss right away.", "Aero plates"), t("Final calculus redo", "Make one final pass through calculus misses you still get wrong.", "Error log")],
            [t("Light skim: Structures & Powerplant", "Skim Structures summaries and Powerplant Prepware misses. Do no new problems.", "Summaries · Prepware"), t("Light skim: ACRM & Air Laws", "Skim 1Aero highlights and flip the Air Law missed pile once.", "1Aero · Air Law flashcards"), t("Exam-day setup", "Check your Notice of Admission for test center, reporting time, and allowed items. Pack ID and supplies; sleep early.")],
            [t("Rest day", "Do no new problems. Eat well, get outside, and confirm your route and travel time."), t("Rest day", "No new problems. Confirm your route and travel time to the testing center."), t("Lights out by 9:30 PM", "Everything is packed. Set two alarms and rest.")]
        ]
    }
];

function dateKey(date) {
    return String(date.getFullYear()) + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

export const SETUP_TASKS = [
    { date: "2026-09-28", text: "Number all Math mock exam sets so each review cycle can be tracked." },
    { date: "2026-09-29", text: "Organize the Principles of Flight PDF and Aero plates by topic." },
    { date: "2026-09-30", text: "Gather Structures summaries: Perry, Raymer, and Teichmann." },
    { date: "2026-10-01", text: "Sort Air Law flashcards into decks." },
    { date: "2026-10-02", text: "Collect 1Aero materials, Prepware, and Powerplant mock exams." },
    { date: "2026-10-03", text: "Build a formula sheet per subject, including ACRM weight and balance and engineering economy." },
    { date: "2026-10-04", text: "Start an error-log notebook and organize it by subject." }
];

export const AELE_SCHEDULE = weeks.flatMap((week, weekIndex) => week.days.map((blocks, dayIndex) => {
    const date = new Date(2026, 9, 5 + weekIndex * 7 + dayIndex);
    return {
        date: dateKey(date),
        week: weekIndex + 1,
        subject: week.subject,
        formula: week.formulas ? week.formulas[dayIndex] : "Write the " + week.formulaSubject + " formulas from memory, check them, and re-drill the misses.",
        blocks: blocks.map((block, index) => ({
            id: "block-" + (index + 1),
            time: ["8:00–11:30 AM", "1:00–4:30 PM", "6:30–9:00 PM"][index],
            start: [8, 13, 18.5][index],
            duration: [3.5, 3.5, 2.5][index],
            label: ["Block A", "Block B", "Block C"][index],
            title: block.title,
            detail: block.detail,
            reference: block.reference
        }))
    };
}));

export const DAILY_ROUTINE = [
    { id: "formula", time: "6:00–7:00 AM", start: 6, duration: 1, label: "Formula drill" },
    { id: "breakfast", time: "7:00–8:00 AM", start: 7, duration: 1, label: "Breakfast & get ready" },
    { id: "block-1", time: "8:00–11:30 AM", start: 8, duration: 3.5, label: "Block A" },
    { id: "lunch", time: "11:30 AM–1:00 PM", start: 11.5, duration: 1.5, label: "Lunch & short nap" },
    { id: "block-2", time: "1:00–4:30 PM", start: 13, duration: 3.5, label: "Block B" },
    { id: "exercise", time: "4:30–6:30 PM", start: 16.5, duration: 2, label: "Exercise & dinner" },
    { id: "block-3", time: "6:30–9:00 PM", start: 18.5, duration: 2.5, label: "Block C" },
    { id: "night-review", time: "9:00–9:30 PM", start: 21, duration: 0.5, label: "Error log & set out materials" },
    { id: "formula-flip", time: "9:30–10:00 PM", start: 21.5, duration: 0.5, label: "Formula flip for tomorrow" },
    { id: "sleep", time: "By 10:30 PM", start: 22, duration: 0.5, label: "Wind down & sleep" }
];

export const EXAM_DATE = "2026-11-09";
