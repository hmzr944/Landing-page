/* Où en est la personne dans son entrée dans Arbor (docs/onboarding.md, §13).
   États fonctionnels : compte créé (session), adresse vérifiée (session obtenue, confirmation active), espace choisi,
   introduction Student terminée, première action d'apprentissage. Les états Business vivent dans la base
   (organisation créée, invitation acceptée, assistant, parcours collaborateur).
   Gardé sur l'appareil et, une fois connecté, recopié dans le profil (migration 007) pour reprendre ailleurs.
   Seuls des drapeaux et des dates y sont écrits : jamais d'objectif rédigé, de sujet ou de contenu de cours. */
(function () {
  const KEY = 'arbor:journey';
  const SYNC = ['workspace', 'studentDone', 'firstActionAt', 'entry', 'businessIntent'];
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } };
  const pick = (o) => Object.fromEntries(SYNC.filter((k) => o[k] != null).map((k) => [k, o[k]]));

  function set(patch) {
    const next = { ...read(), ...patch };
    write(next);
    if (window.Tutor && Tutor.signedIn() && Tutor.saveProfile) Tutor.saveProfile({ onboarding: pick(next) }).catch(() => {});
    return next;
  }
  // Après connexion : ce que le profil sait déjà (autre appareil) complète ce que cet appareil sait
  async function pull() {
    if (!window.Tutor || !Tutor.signedIn() || !Tutor.getProfile) return read();
    const p = await Tutor.getProfile();
    if (!p || !p.onboarding) return read();
    const merged = { ...pick(p.onboarding), ...read() };
    if (p.onboarding.studentDone) merged.studentDone = true;
    write(merged);
    return merged;
  }
  window.Journey = { get: read, set, pull };
})();
