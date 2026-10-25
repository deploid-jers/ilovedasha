export function initMouth4() {
    window.toggleTradition = function(event, element) {
        element.classList.toggle('completed');
        
        if (element.classList.contains('completed')) {
            createMiniHeart(event);
        }
    };

    function createMiniHeart(e) {
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.innerHTML = '💖';
        
        const rect = e.currentTarget.getBoundingClientRect();
        heart.style.left = `${rect.left + rect.width / 2}px`;
        heart.style.top = `${rect.top}px`;
        heart.style.setProperty('--x', `${(Math.random() - 0.5) * 40}px`);
        heart.style.setProperty('--r', `${(Math.random() - 0.5) * 30}deg`);
        
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1200);
    }
}