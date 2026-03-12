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
    configureGuide: () => {}
  };
}

const raidCreator = initRaidCreator(teamController);
const gymRerunCreator = initGymRerunCreator();

initGuideWorkflow({
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
