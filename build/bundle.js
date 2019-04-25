(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('@bhmb/bot')) :
	typeof define === 'function' && define.amd ? define(['@bhmb/bot'], factory) :
	(factory(global['@bhmb/bot']));
}(this, (function (bot) { 'use strict';

var html = "<div class=\"container\">\n    <h3 class=\"title\">AFK Messages</h3>\n    <p>Players can now add messages when they go AFK by saying /afk &lt;message&gt;. Once they say something in chat again or leave the server, their message will be removed. SERVER's AFK message can only be removed with /afkclear. AFK messages will not be preserved between bot launches.</p>\n\n    <p><strong>Important:</strong> Server can not trigger AFK messages.</p>\n\n    <h3 class=\"title\">Commands</h3>\n    <ul>\n        <li>/afk &lt;message&gt; - Use this command to set an AFK message.</li>\n        <li>/afkclear &lt;name&gt; (Admin only) - Manually clear the AFK message of a player.</li>\n    </ul>\n\n    <h3 class=\"title\">Responses</h3>\n    <div class=\"afk_settings\">\n        <label>When a message is set: <input class=\"input\" data-setting=\"onSet\"/></label>\n        <label>When a message is cleared with the /afkclear command: <input class=\"input\" data-setting=\"onClear\"/></label>\n        <label>When someone's name who is afk is mentioned: <input class=\"input\" data-setting=\"onTrigger\"/></label>\n    </div>\n</div>\n";

bot.MessageBot.registerExtension('bibliofile/afk', (ex, world) => {
    const getSettings = () => Object.assign({
        onSet: 'AFK Message set - Say anything in chat to remove it.',
        onClear: 'Cleared {{Name}}\'s AFK Message',
        onTrigger: ' {{Away}} is AFK. Message: {{message}}',
    }, ex.storage.get('settings', {}));
    let triggers = new Map();
    function deleteTrigger(name) {
        triggers.delete(name.toLocaleUpperCase());
    }
    world.addCommand('afk', (player, message) => {
        if (player.name === 'SERVER')
            return;
        triggers.set(player.name, message);
        ex.bot.send(getSettings().onSet, { name: player.name });
    });
    world.addCommand('afkclear', (player, args) => {
        if (player.isAdmin) {
            deleteTrigger(args);
            ex.bot.send(getSettings().onClear, { name: args });
        }
    });
    function chatWatcher({ player, message }) {
        if (player.name == 'SERVER')
            return;
        message = message.toLocaleUpperCase();
        deleteTrigger(player.name);
        for (let [name, afk] of triggers.entries()) {
            if (message.includes(name)) {
                ex.bot.send(getSettings().onTrigger, {
                    message: afk,
                    name: player.name,
                    Away: name[0] + name.substr(1).toLocaleLowerCase(),
                    away: name.toLocaleLowerCase(),
                    AWAY: name
                });
                return; // Only one afk response per message to avoid spam
            }
        }
    }
    function leaveWatcher(player) {
        deleteTrigger(player.name);
    }
    world.onMessage.sub(chatWatcher);
    world.onLeave.sub(leaveWatcher);
    ex.remove = () => {
        for (let command of ['afk', 'afkclear']) {
            world.removeCommand(command);
        }
        world.onMessage.unsub(chatWatcher);
        world.onLeave.unsub(leaveWatcher);
    };
    // Browser only
    const ui = ex.bot.getExports('ui');
    if (!ui)
        return;
    let tab = ui.addTab('AFK Messages');
    tab.innerHTML = html;
    for (let key of Object.keys(getSettings())) {
        let value = getSettings()[key];
        tab.querySelector(`[data-setting=${key}]`).value = value;
    }
    tab.addEventListener('input', () => {
        ex.storage.set('settings', {
            onSet: tab.querySelector('[data-setting=onSet]').value,
            onClear: tab.querySelector('[data-setting=onClear]').value,
            onTrigger: tab.querySelector('[data-setting=onTrigger]').value,
        });
    });
    ex.remove = (function (orig) {
        return () => {
            orig();
            ui.removeTab(tab);
        };
    }(ex.remove));
});

})));
//# sourceMappingURL=bundle.js.map
