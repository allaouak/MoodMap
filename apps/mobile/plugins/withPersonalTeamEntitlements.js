const { withEntitlementsPlist } = require("@expo/config-plugins");

function withPersonalTeamEntitlements(config) {
  return withEntitlementsPlist(config, (entitlementsConfig) => {
    delete entitlementsConfig.modResults["aps-environment"];
    delete entitlementsConfig.modResults["com.apple.developer.associated-domains"];
    delete entitlementsConfig.modResults["com.apple.developer.healthkit.access"];

    entitlementsConfig.modResults["com.apple.developer.healthkit"] = true;

    return entitlementsConfig;
  });
}

module.exports = withPersonalTeamEntitlements;
