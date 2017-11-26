var getAllEntries = (limit=100, skip=0) => {
  var headers = new Headers();
  headers.append('Authorization', 'Bearer <TOKEN>')
  headers.append('X-Contentful-Content-Type', 'game')

  return fetch(`https://api.contentful.com/spaces/3jfl940xk1la/entries?limit=${limit}&skip=${skip}`, {
    method: 'GET',
    mode: 'cors',
    headers: headers
  }).then(response => response.json())
}

var getEntry = (id) => {
  var headers = new Headers();
  headers.append('Authorization', 'Bearer <TOKEN>')
  headers.append('X-Contentful-Content-Type', 'game')

  return fetch('https://api.contentful.com/spaces/3jfl940xk1la/entries/'+id, {
    method: 'GET',
    mode: 'cors',
    headers: headers
  }).then(response => response.json())
}

var updateEntry = async (id, contentType, fields) => {
  var entry = await getEntry(id)
  var headers = new Headers();
  headers.append('Authorization', 'Bearer <TOKEN>')
  headers.append('Content-Type', 'application/vnd.contentful.management.v1+json')
  headers.append('X-Contentful-Content-Type', contentType)
  headers.append('X-Contentful-Version', entry.sys.version)

  return fetch('https://api.contentful.com/spaces/3jfl940xk1la/entries/'+id, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify({
      fields: {
        ...entry.fields,
        ...fields
      }
    })
  }).then(response => response.json())
}

var createEntry = async (contentType, fields) => {
  var headers = new Headers();
  headers.append('Authorization', 'Bearer <TOKEN>')
  headers.append('Content-Type', 'application/vnd.contentful.management.v1+json')
  headers.append('X-Contentful-Content-Type', contentType)

  return fetch('https://api.contentful.com/spaces/3jfl940xk1la/entries', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      fields: {
        ...fields
      }
    })
  }).then(response => response.json())
}

var changeIdOnGamesFromDevToProd = async (aleacc_games) => {
  var entries1 = await getAllEntries(1000,0)
  var entries2 = await getAllEntries(1000,1000)
  var entries = entries1.items.concat(entries2.items)

  var games = entries.filter(e => e.sys.contentType.sys.id === "game")
  var notfound = [...aleacc_games]
  var conflicts = []

  var timeout = 200;

  var done = () => {
    console.log('Could not find', notfound)
    console.log('Conflicts', conflicts)
  }

  var f = async (key, games) => {
    var game = games[key]
    if (game) {
      var aleacc_game = aleacc_games.filter(aleacc_game =>
        aleacc_game.Name === game.fields.name['en-US'] &&
        aleacc_game.Platform === game.fields.platform['en-US'] &&
        aleacc_game.Provider === game.fields.provider['en-US'])

      if (aleacc_game.length > 1) {
        conflicts.push(aleacc_game)
      }
      else if (aleacc_game.length === 1) {
        // Remove from notfound array
        notfound.splice(notfound.indexOf(aleacc_game[0]), 1)

        // Update at contentful
        console.log(`${Math.floor((key/games.length)*100)}% (${key}/${games.length}) ${game.fields.name['en-US']}`)

        if (aleacc_game[0].Id !== game.fields.backendId['en-US']) {
          console.log('update game id')
          var da = await updateEntry(game.sys.id, 'game', {
            backendId: {'en-US':aleacc_game[0].Id}
          })
        }
      }
    }

    // End if this is the last one
    if (!games[key+1])
      return done()

    // Next
    window.updateLoop = setTimeout(() => {
      f(key+1, games)
    }, timeout)
  }

  // Start loop
  f(0, games);
}

var importGames = async (aleacc_games) => {
  var entries1 = await getAllEntries(1000,0)
  var entries2 = await getAllEntries(1000,1000)
  var entries = entries1.items.concat(entries2.items)
  var games = entries.filter(e => e.sys.contentType.sys.id === "game")

  var newgames = aleacc_games.reduce((acc,game) => {
    var entry = games.find(e => e.fields.backendId && e.fields.backendId['en-US'] === game.Id)
    if (!entry)
      acc.push(game)
    return acc
  }, [])

  newgames = newgames.map(game => ({
    identifier: {
      "en-US": slugify(game.Name)
    },
    name: {
      "en-US": game.Name
    },
    url: {
      "en-US": slugify(game.Name)
    },
    backendId: {
      "en-US": game.Id
    },
    aspectRatio: {
      "en-US": "16:9"
    },
    platform: {
      "en-US": game.Platform
    },
    provider: {
      "en-US": game.Provider
    }
  }))

  var f = async (key, items) => {

    if (items[key]) {
      var e = await createEntry('game', items[key])
      console.log('create', items[key], e)
    }

    if (!items[key+1])
      return

    window.updateLoop = setTimeout(() => {
      f(key+1, items)
    }, 500)
  }

  f(0, newgames)
}

var dataimport = (key, items) => {
  var headers = new Headers();
  headers.append('Authorization', 'Bearer <TOKEN>
  ')
  headers.append('Content-Type', 'application/vnd.contentful.management.v1+json')
  headers.append('X-Contentful-Content-Type', 'game')

  fetch('https://api.contentful.com/spaces/3jfl940xk1la/entries', {
    method: 'POST',
    headers: headers,
    body: {
      fields: items[key]
    }
  }).then(response => dataimport(key+1, dataimport));
}

function slugify(text)
{
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

//changeIdOnGamesFromDevToProd(aleaccgames)
importGames(aleaccgames)
