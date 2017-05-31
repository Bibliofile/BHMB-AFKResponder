//jshint esversion: 6
/*global
    MessageBot
*/

MessageBot.registerExtension('bibliofile/afk2', function(ex, world) {
    function getSettings() {
        return world.storage.getObject('afk_settings', {
            onSet: 'AFK Message set - Say anything in chat to remove it.',
            onClear: 'Cleared {{Name}}\'s AFK Message',
            onTrigger: ' {{Away}} is AFK. Message: {{message}}',
        });
    }

    var triggers = {};

    function commandWatcher(info) {
        var name = info.player.getName().toLocaleUpperCase();

        checkTriggerUpdate(name);

        switch (info.command.toLocaleLowerCase()) {
            case 'afk':
                triggers[name] = info.args;
                ex.bot.send(getSettings().onSet, { name: name });
                break;
            case 'afkclear':
                if (info.player.isAdmin()) {
                    info.args = info.args.toLocaleUpperCase();
                    checkTriggerUpdate(info.args);
                    ex.bot.send(getSettings().onClear, { name: info.args });
                }
        }
    }

    function chatWatcher(info) {
        var name = info.player.getName().toLocaleUpperCase();
        var message = info.message.toLocaleUpperCase();
        checkTriggerUpdate(name);

        if (name == 'SERVER') return;

        for (let n in triggers) {
            if (message.includes(n)) {
                ex.bot.send(getSettings().onTrigger, {
                    message: triggers[n],
                    Away: n[0] + n.substr(1).toLocaleLowerCase(),
                    away: n.toLocaleLowerCase(),
                    AWAY: n,
                    name: name
                });
                return; //Only one per message, max.
            }
        }
    }

    function leaveWatcher(player) {
        var name = player.getName().toLocaleUpperCase();
        checkTriggerUpdate(name);
    }

    function checkTriggerUpdate(name) {
        if (triggers.hasOwnProperty(name)) {
            delete triggers[name];
        }
    }

    world.onCommand.sub(commandWatcher);
    world.onMessage.sub(chatWatcher);
    world.onLeave.sub(leaveWatcher);

    ex.uninstall = function() {
        world.onCommand.unsub(commandWatcher);
        world.onMessage.unsub(chatWatcher);
        world.onLeave.unsub(leaveWatcher);
        world.storage.clearNamespace('afk_settings');
    };

    // Browser only past here
    if (ex.isNode || !ex.bot.getExports('ui')) return;

    var ui = ex.bot.getExports('ui');

    var tab = ui.addTab('AFK Messages');
    tab.innerHTML = `<div class="container"> <h3 class="title">AFK Messages</h3> <p>Players can now add messages when they go AFK by saying /afk &lt;message&gt;. Once they say something in chat again or leave the server, their message will be removed. SERVER&apos;s AFK message can only be removed with /afkclear. AFK messages will not be preserved between bot launches.</p><p><strong>Important:</strong> Server can not trigger AFK messages.</p><h3 class="title">Commands</h3> <ul> <li>/afk &lt;message&gt; - Use this command to set an AFK message.</li><li>/afkclear &lt;name&gt; (Admin only) - Manually clear the AFK message of a player.</li></ul> <h3 class="title">Responses</h3> <div class="afk_settings"> <label>When a message is set: <input class="input" data-setting="onSet"/></label> <label>When a message is cleared with the /afkclear command: <input class="input" data-setting="onClear"/></label> <label>When an AFK name is mentioned: <input class="input" data-setting="onTrigger"/></label> </div></div>`;

    Object.keys(getSettings()).forEach(function(key) {
        var value = getSettings()[key];
        tab.querySelector('[data-setting=' + key + ']').value = value;
    });

    tab.addEventListener('input', function() {
        world.storage.set('afk_settings', {
            onSet: tab.querySelector('[data-setting=onSet]').value,
            onClear: tab.querySelector('[data-setting=onClear]').value,
            onTrigger: tab.querySelector('[data-setting=onTrigger]').value,
        });
    });

    ex.uninstall = function() {
        ui.removeTab(tab);
        world.onCommand.unsub(commandWatcher);
        world.onMessage.unsub(chatWatcher);
        world.onLeave.unsub(leaveWatcher);
        world.storage.clearNamespace('afk_settings');
    };
});
