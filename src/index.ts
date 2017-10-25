import { MessageBot, Player } from '@bhmb/bot'
import { UIExtensionExports } from '@bhmb/ui'

import html from './tab.html'

interface Settings {
  onSet: string
  onClear: string
  onTrigger: string
}

MessageBot.registerExtension('bibliofile/afk', (ex, world) => {
  const getSettings = (): Settings => Object.assign({
    onSet: 'AFK Message set - Say anything in chat to remove it.',
    onClear: 'Cleared {{Name}}\'s AFK Message',
    onTrigger: ' {{Away}} is AFK. Message: {{message}}',
  }, ex.storage.get<Partial<Settings>>('settings', {}))

  let triggers = new Map<string, string>()
  function deleteTrigger(name: string) {
    triggers.delete(name.toLocaleUpperCase())
  }

  world.addCommand('afk', (player, message) => {
    triggers.set(player.name, message)
    ex.bot.send(getSettings().onSet, { name: player.name })
  })
  world.addCommand('afkclear', (player, args) => {
    if (player.isAdmin) {
      deleteTrigger(args)
      ex.bot.send(getSettings().onClear, { name: args})
    }
  })

  function chatWatcher({player, message}: { player: Player, message: string}) {
    if (player.name == 'SERVER') return
    message = message.toLocaleUpperCase()

    deleteTrigger(player.name)

    for (let [name, afk] of triggers.entries()) {
      if (message.includes(name)) {
        ex.bot.send(getSettings().onTrigger, {
          message: afk,
          name: player.name,
          Away: name[0] + name.substr(1).toLocaleLowerCase(),
          away: name.toLocaleLowerCase(),
          AWAY: name
        })
        return // Only one afk response per message to avoid spam
      }
    }
  }

  function leaveWatcher(player: Player) {
    deleteTrigger(player.name)
  }

  world.onMessage.sub(chatWatcher)
  world.onLeave.sub(leaveWatcher)

  ex.remove = () => {
    for (let command of ['afk', 'afkclear']) {
      world.removeCommand(command)
    }
    world.onMessage.unsub(chatWatcher)
    world.onLeave.unsub(leaveWatcher)
  }

  // Browser only
  const ui = ex.bot.getExports('ui') as UIExtensionExports | undefined
  if (!ui) return

  let tab = ui.addTab('AFK Messages')
  tab.innerHTML = html

  for (let key of Object.keys(getSettings()) as Array<keyof Settings>) {
    let value = getSettings()[key]
    ;(tab.querySelector(`[data-setting=${key}]`) as HTMLInputElement).value = value;
  }

  tab.addEventListener('input', () => {
    ex.storage.set('settings', {
      onSet: (tab.querySelector('[data-setting=onSet]') as HTMLInputElement).value,
      onClear: (tab.querySelector('[data-setting=onClear]') as HTMLInputElement).value,
      onTrigger: (tab.querySelector('[data-setting=onTrigger]') as HTMLInputElement).value,
    })
  })

  ex.remove = (function(orig) {
    return () => {
      orig()
      ui.removeTab(tab)
    }
  }(ex.remove))
})
