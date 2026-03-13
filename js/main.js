import { initGuideWorkflow } from "./creators/guide_workflow.js";
import { initGymRerunCreator } from "./creators/gym_rerun.js";
import { initRaidCreator } from "./creators/raid.js";
import { initTeamCreation } from "./creators/team_creation.js";
import { initBackground } from "./lib/background.js";

try {
  initBackground();
} catch (error) {
  console.error("Background init failed:", error);
}

let teamController;
try {
  teamController = initTeamCreation({ startHidden: true });
} catch (error) {
  console.error("Team creator init failed:", error);
  teamController = {
    setVisible: () => {},
    getSnapshot: () => ({ title: "TEAM SHOWDOWN", team: [], raw: "" }),
    setOnChange: () => {},
    loadSnapshot: () => {},
    configureGuide: () => {}
  };
}

const raidCreator = initRaidCreator(teamController);
const gymRerunCreator = initGymRerunCreator();

initGuideWorkflow({
  buildGuideJson: (meta) => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    meta: {
      guideType: String(meta?.guideType || "Raid"),
      strategyName: String(meta?.strategyName || ""),
      authorName: String(meta?.authorName || ""),
      ignName: String(meta?.ignName || ""),
      description: String(meta?.description || "")
    },
    raid: raidCreator.getState()
  }),
  prepareGuideJsonImport: async (payload, meta) => {
    const raidState = payload?.raid || payload;
    if (meta?.guideType === "Raid") {
      return {
        version: Number(payload?.version || 1),
        exportedAt: String(payload?.exportedAt || ""),
        meta,
        raid: raidCreator.prepareImportedState({
          meta,
          teamSnapshot: raidState?.teamSnapshot,
          plannerColumns: raidState?.plannerColumns,
          turnRows: raidState?.turnRows
        })
      };
    }
    throw new Error("Unsupported guide type in imported JSON.");
  },
  onImportGuideJson: async (payload, meta) => {
    const raidState = payload?.raid || payload;
    if (meta?.guideType === "Raid") {
      gymRerunCreator.deactivate();
      raidCreator.loadState(raidState);
      return;
    }
    raidCreator.deactivate();
    gymRerunCreator.activate(meta);
  },
  onGuideLock: (meta) => {
    if (meta?.guideType === "Raid") {
      gymRerunCreator.deactivate();
      raidCreator.activate(meta);
      return;
    }
    raidCreator.deactivate();
    gymRerunCreator.activate(meta);
  },
  onGuideEdit: () => {}
});
