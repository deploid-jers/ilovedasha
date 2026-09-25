export function initMouth3(){
    window.switchAlbum = function(event, albumId) {
        const tabs = document.querySelectorAll('.album-tab');
        const contents = document.querySelectorAll('.album-content');

        tabs.forEach(tab => tab.classList.remove('active'));
        contents.forEach(content => content.classList.remove('active'));

        event.currentTarget.classList.add('active');
        document.getElementById(albumId).classList.add('active');
    };

    const happinessNotes = [
        { emoji: "✨", text: "Ты делаешь любой, даже самый простой день особенным." },
        { emoji: "🥰", text: "Обожаю твою улыбку, когда ты смеешься над моими шутками." },
        { emoji: "☕", text: "Каждое день с тобой - становится лучшим." },
        { emoji: "🧸", text: "Обнимать тебя - самое уютное чувство на свете." },
        { emoji: "🍕", text: "С тобой даже просмотр фильмов и еда становятся в 100 раз вкуснее!" },
        { emoji: "💖", text: "Ты - мой самый родной и любимый человечек." },
    ];

    let lastNoteIndex = -1;

    const jarCard = document.getElementById('jarCard');
    const notePopup = document.getElementById('notePopup');
    const noteEmoji = document.getElementById('noteEmoji');
    const noteText = document.getElementById('noteText');

    if (jarCard) {
        jarCard.addEventListener('click', () => {
            jarCard.classList.remove('shake');
            void jarCard.offsetWidth;
            jarCard.classList.add('shake');

            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * happinessNotes.length);
            } while (randomIndex === lastNoteIndex && happinessNotes.length > 1);
            
            lastNoteIndex = randomIndex;
            const note = happinessNotes[randomIndex];

            noteEmoji.textContent = note.emoji;
            noteText.textContent = note.text;
            notePopup.classList.remove('hidden');
        });
    }
}