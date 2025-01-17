/// <reference path="api.ts" />
module Client {
  declare var dispatcher;
  declare var DEBUG;
  declare var CBOR;
  declare var uuid;

  type Id = string
  export type Fact = any[]
  export type MapDiff = [string, string[], Fact[], Fact[]]
  export type MapDiffs = MapDiff[]
  export type PayloadChange = [Id, Id[], Fact[], Fact[]]
  export interface Payload { session?: string, changes?: PayloadChange[], commands: Fact[] }


  // Override these values to integrate with app.
  type OnReceive = (changed:string[], commands:any[][]) => void;
  export var onReceive:OnReceive = () => undefined;
  export var showNotice = (notice) => undefined;
  export var hideNotice = (notice) => undefined;

  function isUndefined(val) {
    return val === undefined;
  }

  /* Integrated Debugging Tooling */
  export function nukeTable(viewId:string) { // from orbit
    var fieldIds = Api.get.fields(viewId);
    var toRemove = Api.get.facts(viewId);
    sendToServer([[viewId, fieldIds, [], toRemove]]);
  }

  function formatTime(time?) {
    time = time || new Date();
    return pad("", time.getHours(), "0", 2) + ":" + pad("", time.getMinutes(), "0", 2) + ":" + pad("", time.getSeconds(), "0", 2);
  }

  function pad(left, right = "", pad = " ", length = 120) {
    left = "" + left;
    right = "" + right;

    var padding = "";
    var delta = length - left.length - right.length;
    if (delta > 0) {
      padding = new Array(delta + 1).join(pad);
    }
    return left + padding + right;
  }

  function writeDataToConsole(data, verbosity) {
    verbosity = +verbosity;
    var consoleTable = console["table"].bind(console) || console.log.bind(console);
    data.changes.forEach(function(change) {
      if (change[2].length || change[3].length) {
        if (verbosity == 1) {
          console.log(" ", change[0], `+${change[2].length}/-${change[3].length}`);
        }
        if (verbosity == 2) {
          console.log(" ", change[0], `+${change[2].length}/-${change[3].length}`,
            { fields: change[1], inserts: change[2], removes: change[3] });
        }
        if (verbosity == 3) {
          console.log(" ", change[0], `+${change[2].length}/-${change[3].length}`);
          console.groupCollapsed(`   inserts ${change[1]}`);
          consoleTable(change[2]);
          console.groupEnd();
          console.groupCollapsed(`   removes ${change[1]}`);
          consoleTable(change[3]);
          console.groupEnd();
        }
      }
    });
  }

  // Generate debugging information on incoming or outgoing payloads.
  function getDataStats(data:Payload) {
    var totalAdds = 0;
    var totalRemoves = 0;
    var malformedDiffs:string[] = [];
    var badValues:string[] = [];
    data.changes.forEach(function(change) {
      totalAdds += change[2].length;
      totalRemoves += change[3].length;
      // Simple check to notify programmers of definitely unhealthy payloads they may be sending.
      var hasMalformedDiffs = false;
      var hasBadValues = false;
      change[2].forEach(function(diff) {
        hasMalformedDiffs = hasMalformedDiffs || (diff.length !== change[1].length);
        hasBadValues = hasBadValues || diff.some(isUndefined);
      });

      change[3].forEach(function(diff) {
        hasMalformedDiffs = hasMalformedDiffs || (diff.length !== change[1].length);
        hasBadValues = hasBadValues || diff.some(isUndefined);
      });
      if (hasMalformedDiffs) {
        malformedDiffs.push(change[0]);
      }
      if (hasBadValues) {
        badValues.push(change[0]);
      }
    });

    return { adds: totalAdds, removes: totalRemoves, malformedDiffs: malformedDiffs, badValues: badValues };
  }

  export function factToMap(viewId:Id, fact:Fact, fieldIds:string[] = Api.get.fields(viewId)) {
    if(arguments.length < 2) { throw new Error("Must specify viewId and fact to convert to map."); }
    var length = fieldIds.length;
    var map = {};
    for(var ix = 0; ix < length; ix++) {
      map[fieldIds[ix]] = fact[ix];
    }
    return map;
  }

  function filterFactsBySession<T>(facts:T[], sessionFieldIx:number, session:string) {
    var neue:T[] = [];
    for(let fact of facts) {
      if(fact[sessionFieldIx] !== session) {
        neue.push(fact);
      }
    }
    return neue;
  }

  var server = { connected: false, queue: [], initialized: false, lastSent: [], ws: null, dead: false };
  function connectToServer() {
    var queue = server.queue;
    var wsAddress = "ws://localhost:2794";
    if(window.location.protocol !== "file:") {
      wsAddress = `ws://${window.location.hostname}:2794`;
    }
    var ws = new WebSocket(wsAddress, []);
    server.ws = ws;

    ws.onerror = ws.onclose = function(error) {
      server.connected = false;
      server.dead = true;
      reconnect();
      showNotice({content: `Error: Cannot communicate with Eve Server!`, type: "error", id: "server dead", duration: 0});
    }

    ws.onopen = function() {
      server.connected = true;
      if(server.dead) {
        server.dead = false;
        hideNotice({noticeId: "server dead"});
        showNotice({content: "Reconnected to server!"});
      }
      for (var i = 0, len = queue.length; i < len; i++) {
        sendToServer(queue[i]);
      }
    }

    ws.onmessage = function(e) {
      var start = Api.now();
      var time:number;
      var data:Payload = JSON.parse(e.data);
      var time = Api.now() - start;
      if (time > 5) {
        console.log("slow parse (> 5ms):", time);
      }

      var initializing = !server.initialized;
      if(data.commands) {
        for(let [command, ...args] of data.commands) {
          // If we are loading in this event, we should ignore tags and accept all diffs.
          if(command === "loaded" || command === "events set") {
            initializing = true;
            // @FIXME: Send filename + path to dispatcher.
          }
        }
      }

      // For an explanation of what changes are synced, check: <https://github.com/witheve/Eve/blob/master/design/sync.md>
      var changes:PayloadChange[] = [];
      var changedViews:string[] = [];
      for(let change of data.changes) {
        let [view, fields, inserts, removes] = change;
        if(!initializing && Api.get.hasTag(view, "client")) {
          // If view is client-controlled, discard any changes originating from our session.
          var sessionFieldIx:number;
          for(let fieldIx = 0; fieldIx < fields.length; fieldIx++) {
            if(Api.get.hasTag(fields[fieldIx], "session")) {
              sessionFieldIx = fieldIx;
              break;
            }
          }

          changedViews.push(view);
          changes.push([view,
                        fields,
                        filterFactsBySession(inserts, sessionFieldIx, data.session),
                        filterFactsBySession(removes, sessionFieldIx, data.session)]);

        } else if (!initializing && Api.get.hasTag(view, "editor")) {
          // If view is editor controlled, we discard all changes.
          continue;
        } else {
          // If view is server controlled, accept all changes.
          changes.push(change);
        }
      }

      if (DEBUG.RECEIVE) {
        var stats = getDataStats({session: data.session, changes: changes, commands: data.commands});
        if (stats.adds || stats.removes) {
          var header = `[client:received][+${stats.adds}/-${stats.removes}]`;
          console.groupCollapsed(pad(header, formatTime()));
          if (stats.malformedDiffs.length) {
            console.warn("The following views have malformed diffs:", stats.malformedDiffs);
          }
          if (stats.badValues.length) {
            console.warn("The following views have bad values:", stats.badValues);
          }
          writeDataToConsole({ changes: changes }, DEBUG.RECEIVE);
          console.groupEnd();
        }

        start = Api.now();
      }
      if(changes.length) {
        let changeSet = Api.ixer.changeSet();
        for(let [table, fields, adds, removes] of changes) {
          let mapAdds = [];
          let ix = 0;
          for(let add of adds) {
            mapAdds[ix] = factToMap(table, add, fields);
            ix++;
          }
          let mapRemoves = [];
          ix = 0;
          for(let remove of removes) {
            mapAdds[ix] = factToMap(table, remove, fields);
            ix++;
          }
          changeSet.addFacts(table, mapAdds);
          changeSet.removeFacts(table, mapRemoves);
        }
        Api.ixer.applyChangeSet(changeSet);
      }

      // If we haven't initialized the client yet, do so after we've handled the initial payload, so it can be accessed via the indexer.
      if (initializing) {
        var eventId = (Api.get.facts("client event") || []).length; // Ensure eids are monotonic across sessions.
        // @NOTE: Is this the right behavior? Or should we GC the previous environment and initialize a new one?
        if(!server.initialized) {
          for(var initFunc of afterInitFuncs) {
            initFunc();
          }
        }
        server.initialized = true;
      }

      time = Api.now() - start;
      if(DEBUG.RECEIVE) {
        if (time > 5) {
          console.log("slow handleDiffs (> 5ms):", time);
        }
      }

      onReceive(changedViews, data.commands);
    };
  }

  export function sendToServer(changes?:MapDiffs, commands?) {
    if (!server.connected) {
      console.warn("Not connected to server, adding changes to queue.");
      server.queue.push(changes);
      return;
    }

    var payload:Payload = {changes: undefined, commands: undefined};
    if(changes) payload.changes = changes;
    if(commands) payload.commands = commands;

    if (DEBUG.SEND) {
      var stats = getDataStats(payload);
      if (stats.adds || stats.removes) {
        var header = `[client:sent][+${stats.adds}/-${stats.removes}]`;
        console.groupCollapsed(pad(header, formatTime()));
        if (stats.malformedDiffs.length) {
          console.warn("The following views have malformed diffs:", stats.malformedDiffs);
        }
        if (stats.badValues.length) {
          console.warn("The following views have bad values:", stats.badValues);
        }
        writeDataToConsole(payload, DEBUG.SEND);
        console.groupEnd();
      }
    }

    if (payload.changes.length || payload.commands && payload.commands.length) {
      server.ws.send(CBOR.encode(payload));
    }
  }

  var afterInitFuncs: Function[] = [];
  export function afterInit(func) {
    afterInitFuncs.push(func);
  }

  // Try to reconnect to the server with linear falloff.
  let checkReconnectTimeout;
  let checkReconnectDelay = 0;
  function reconnect() {
    if(checkReconnectTimeout) { return; }
    checkReconnectTimeout = setTimeout(tryConnect, 2000 + checkReconnectDelay++ * 2000);
    connectToServer();
  }

  function tryConnect() {
    checkReconnectTimeout = undefined;
    if(server.connected) {
      checkReconnectDelay = 0;
      //@FIXME: Need to resync here.
    } else {
      reconnect();
    }
  }

  document.addEventListener("DOMContentLoaded", reconnect);
}
