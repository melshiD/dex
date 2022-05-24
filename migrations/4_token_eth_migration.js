const isETH = artifacts.require("isETH");
const Dex = artifacts.require("Dex");

module.exports = async function(deployer/*, network, accounts*/) {
  await deployer.deploy(isETH);
};
