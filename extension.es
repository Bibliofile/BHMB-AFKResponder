//jshint esversion: 6
/*global
    MessageBotExtension
*/

class AFKExtension {
    constructor(ex) {
        this.ex = ex;
        this.hook = ex.hook;
        this.storage = ex.storage;
        this.ui = ex.ui;
        this.world = ex.world;

        this.triggers = {};
        this.commandWatcher = this.commandWatcher.bind(this);
        this.chatWatcher = this.chatWatcher.bind(this);
        this.leaveWatcher = this.leaveWatcher.bind(this);
    }

    start(autoLaunch = false) {
        this.ex.setAutoLaunch(autoLaunch);
        this.hook.listen('world.command', this.commandWatcher);
        this.hook.listen('world.chat', this.chatWatcher);
        this.hook.listen('world.leave', this.leaveWatcher);
        this.tab = this.ui.addTab('AFK Messages');

        this.tab.innerHTML = `<div class="container"> <h3 class="title">AFK Messages</h3> <p>Players can now add messages when they go AFK by saying /afk &lt;message&gt;. Once they say something in chat again or leave the server, their message will be removed. SERVER's AFK message can only be removed with /afkclear. AFK messages will not be preserved between bot launches.</p><p><strong>Important:</strong> Server can not trigger AFK messages.</p><h3 class="title">Commands</h3> <ul> <li>/afk &lt;message&gt; - Use this command to set an AFK message.</li><li>/afkclear &lt;name&gt; (Admin only) - Manually clear the AFK message of a player.</li></ul> <h3 class="title">Responses</h3> <div class="afk_settings"> <label>When a message is set: <input class="input" data-setting="onSet"/></label> <label>When a message is cleared with the /afkclear command: <input class="input" data-setting="onClear"/></label> <label>When someone's name who is afk is mentioned: <input class="input" data-setting="onTrigger"/></label> </div></div>`;

        this.tab.addEventListener('change', () => {
            this.settings.onSet = this.tab.querySelector('[data-setting="onSet"]').value;
            this.settings.onClear = this.tab.querySelector('[data-setting="onClear"]').value;
            this.settings.onTrigger = this.tab.querySelector('[data-setting="onTrigger"]').value;
            this.storage.set('afk_settings', this.settings);
        });

        this.settings = this.storage.getObject('afk_settings', {
            onSet: `AFK Message set - Say anything in chat to remove it.`,
            onClear: `Cleared {{Name}}'s AFK Message`,
            onTrigger: ` {{Away}} is AFK. Message: {{message}}`,
        });

        this.tab.querySelector('[data-setting="onSet"]').value = this.settings.onSet;
        this.tab.querySelector('[data-setting="onClear"]').value = this.settings.onClear;
        this.tab.querySelector('[data-setting="onTrigger"]').value = this.settings.onTrigger;
    }

    uninstall() {
        this.ui.removeTab(this.tab);
        this.hook.remove('world.command', this.commandWatcher);
        this.hook.remove('world.chat', this.chatWatcher);
        this.hook.remove('world.leave', this.leaveWatcher);
    }

    send(message, replace = {}, name = false) {
        for (let key of Object.keys(replace)) {
            message = message.replace(new RegExp(`{{${key}}}`, 'g'), replace[key]);
        }

        if (name) {
            message = message
                .replace(/{{Name}}/g, name[0] + name.substr(1).toLocaleLowerCase())
                .replace(/{{name}}/g, name.toLocaleLowerCase())
                .replace(/{{NAME}}/g, name);
        }

        this.ex.bot.send(message);
    }

    commandWatcher(name, command, message) {
        name = name.toLocaleUpperCase();

        this.checkTriggerUpdate(name);

        switch (command.toLocaleLowerCase()) {
            case 'afk':
                this.triggers[name] = message;
                this.send(this.settings.onSet, {}, name);
                break;
            case 'afkclear':
                if (this.world.isAdmin(name)) {
                    message = message.toLocaleUpperCase();
                    this.checkTriggerUpdate(message);
                    this.send(this.settings.onClear, {}, message);
                }
        }
    }

    chatWatcher(name, message) {
        name = name.toLocaleUpperCase();
        message = message.toLocaleUpperCase();
        this.checkTriggerUpdate(name);

        for (let n in this.triggers) {
            if (message.includes(n)) {
                this.send(this.settings.onTrigger, {
                    message: this.triggers[n],
                    Away: n[0] + n.substr(1).toLocaleLowerCase(),
                    away: n.toLocaleLowerCase(),
                    AWAY: n,
                }, name);
                return; //Only one per message, max.
            }
        }
    }

    leaveWatcher(name) {
        name = name.toLocaleUpperCase();
        this.checkTriggerUpdate(name);
    }

    checkTriggerUpdate(name) {
        if (this.triggers.hasOwnProperty(name)) {
            delete this.triggers[name];
        }
    }
}

var afk = new AFKExtension(MessageBotExtension('afk'));
afk.start(true);
