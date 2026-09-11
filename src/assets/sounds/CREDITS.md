# Sonidos ambiente

Bucles de `AMBIENT_SOUNDS` (`src/app/models/pomodoro.model.ts`). Las grabaciones
vienen de la selección de [Blanket](https://github.com/rafaelmardojai/blanket),
que ya las edita para que se puedan repetir.

| Archivo      | Grabación                                                                 | Autor     | Licencia        |
| ------------ | ------------------------------------------------------------------------- | --------- | --------------- |
| `rain.m4a`   | [Rain](https://freesound.org/s/524605/)                                   | alex36917 | CC BY 4.0       |
| `cafe.m4a`   | [Restaurant Ambiance](https://soundbible.com/1664-Restaurant-Ambiance.html) | stephan   | Dominio público |
| `forest.m4a` | [Birds](https://freesound.org/s/156826/)                                  | kvgarlic  | CC0             |
| `waves.m4a`  | [Waves](https://freesound.org/s/48412/)                                   | Luftrum   | CC BY 4.0       |
| `brown.m4a`  | Ruido marrón generado con `ffmpeg` (`anoisesrc=color=brown`)              | —         | CC0             |

Cómo se han preparado: cada clip se recorta (75 s; 14 s la cafetería, 30 s el
ruido), sus siguientes 3–4 s se funden sobre el principio para que el final
empalme con el comienzo sin corte, se iguala la sonoridad a −24 LUFS y se
codifica en AAC a 96 kb/s (`.m4a`, el formato que reproducen tanto iOS como
Android).

Las grabaciones CC BY exigen el crédito: se muestra en Ajustes → "Créditos de
los sonidos". Si se cambia un sonido, hay que actualizar esa lista y esta tabla.
