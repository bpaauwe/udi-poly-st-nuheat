'use strict';

const storage = require('node-persist');
storage.init({dir: './storage'});

// This is an example NodeServer Node definition.
// You need one per nodedefs.

// nodeDefId must match the nodedef id in your nodedef
const nodeDefId = 'THERMOSTAT_F';

module.exports = function(Polyglot) {
// Utility function provided to facilitate logging.
  const logger = Polyglot.logger;

  // This is your custom Node class
  class ThermostatNode_F extends Polyglot.Node {

    // polyInterface: handle to the interface
    // address: Your node address, withouth the leading 'n999_'
    // primary: Same as address, if the node is a primary node
    // name: Your node name
    constructor(polyInterface, primary, address, name) {
      super(nodeDefId, polyInterface, primary, address, name);

      this.nuheat = require('../lib/nuheat.js')(Polyglot, polyInterface);

      this.commands = {
        QUERY: this.query,
        CLISPH: this.setPointHeat,
      };

      this.drivers = {
        ST: {value: '0', uom: 17},
        CLISPH: {value: '0', uom: 17},
        CLIMD: {value: '0', uom: 25},
        CLIHCS: {value: '0', uom: 66},
      };
    }

    async query() {
      // logger.info('Node Name: ' + this.name);
      // logger.info('Node Address:' + this.address);
      let sessionId = await storage.getItem('sessionId');
      // logger.info('SessionId:' + sessionId);

      let statInfo = await this.nuheat.thermostat(this.address);
      if (statInfo == null) {
        logger.error('Not Authenticated... Re-Authenticating...');
        this.nuheat.authenticate();
      } else {
        // logger.info(JSON.stringify(statInfo));
        logger.info(statInfo.Temperature);
        logger.info(statInfo.SetPointTemp);
        logger.info(statInfo.OperatingMode);
        logger.info(statInfo.Heating);

        let temp = this.nuheat.CtoF(statInfo.Temperature);
        let setPoint = this.nuheat.CtoF(statInfo.SetPointTemp);
        let isHeating = 0;

        if (statInfo.Heating) {
          isHeating = 1;
        } else {
          isHeating = 0
        }

        logger.info('Temperature: ' + temp);
        logger.info('SetPoint: ' + setPoint);
        this.setDriver('ST', temp, true);
        this.setDriver('CLISPH', setPoint, true);
        this.setDriver('CLIMD', statInfo.OperatingMode, true);
        this.setDriver('CLIHCS', 1, true);

      }
    }

    setPointHeat(message) {
      logger.info('setPointHeat: ' + message.value);
      let setPoint = this.nuheat.FtoJC(message.value);

      this.nuheat.setPointHeat(this.address, setPoint);
      this.setDriver('CLISPH', message.value, true);
    }
    
    // onDON(message) {
    //   logger.info('DON (%s): %s',
    //     this.address,
    //     message.value ? message.value : 'No value');

    //   // setDrivers accepts string or number (message.value is a string)
    //   this.setDriver('ST', message.value ? message.value : '100');
    // }

    // onDOF() {
    //   logger.info('DOF (%s)', this.address);
    //   this.setDriver('ST', '0');
    // }
  };

  // Required so that the interface can find this Node class using the nodeDefId
  ThermostatNode_F.nodeDefId = nodeDefId;

  return ThermostatNode_F;
};


// Those are the standard properties of every nodes:
// this.id              - Nodedef ID
// this.polyInterface   - Polyglot interface
// this.primary         - Primary address
// this.address         - Node address
// this.name            - Node name
// this.timeAdded       - Time added (Date() object)
// this.enabled         - Node is enabled?
// this.added           - Node is addeto ISY?
// this.commands        - List of allowed commands
//                        (You need to define them in your custom node)
// this.drivers         - List of drivers
//                        (You need to define them in your custom node)

// Those are the standard methods of every nodes:
// Get the driver object:
// this.getDriver(driver)

// Set a driver to a value (example set ST to 100)
// this.setDriver(driver, value, report=true, forceReport=false, uom=null)

// Send existing driver value to ISY
// this.reportDriver(driver, forceReport)

// Send existing driver values to ISY
// this.reportDrivers()

// When we get a query request for this node.
// Can be overridden to actually fetch values from an external API
// this.query()

// When we get a status request for this node.
// this.status()
