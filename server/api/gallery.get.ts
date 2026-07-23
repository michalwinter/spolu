export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  try {
    const gallery = await DailyReport.aggregate([
      // 1. Rozdělí dokumenty podle vzpomínek (co vzpomínka, to dokument)
      { $unwind: {
        path: '$memories',
        includeArrayIndex: 'memoryIndex',
      }},

      // 2. Rozdělí dokumenty podle fotek (co fotka, to dokument)
      { $unwind: {
        path: '$memories.photos',
        includeArrayIndex: 'photoIndex',
      }},

      // 3. Seřadí výsledky od nejnovějších dat
      { 
        $sort: { 
          date: -1,
          'memories.time': -1,
          memoryIndex: -1,
          photoIndex: -1
        }
      },

      {
        $lookup: {
          from: 'users', // ZDE POZOR: Musí to být přesný název kolekce v MongoDB (zpravidla malými písmeny a v množném čísle, např. 'users')
          localField: 'memories.photos.authorId', // Kde je ID uložené v aktuálním dokumentu fotky
          foreignField: '_id', // Podle jakého pole se hledá v kolekci 'users'
          as: 'authorData' // Jak se bude dočasně jmenovat pole s nalezeným uživatelem
        }
      },

      { 
        $unwind: { 
          path: '$authorData', 
          preserveNullAndEmptyArrays: true // Pokud by fotka náhodou neměla autora, nespadne to, ale vrátí null
        } 
      },

      // 4. Zformátuje výstup do čistého, plochého JSONu pro frontend
      {
        $project: {
          _id: 0, // Skryje původní ID reportu
          // Údaje o fotce
          filename: '$memories.photos.filename',
          thumbnailFilename: '$memories.photos.thumbnailFilename',
          width: '$memories.photos.width',
          height: '$memories.photos.height',
          mimeType: '$memories.photos.mimeType',
          author: {
            id: '$authorData._id',
            name: '$authorData.name',
            username: '$authorData.username'
          },
          
          // Kontext vzpomínky
          memory: {
            date: '$date',
            reportTitle: '$title',
            text: '$memories.text',
            time: '$memories.time',
            location: '$memories.location',
            lat: '$memories.lat',
            lng: '$memories.lng'
          }
        }
      }
    ])

    return gallery

  } catch (error) {
    console.error('Chyba při načítání galerie:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nepodařilo se načíst galerii fotek.'
    })
  }

});