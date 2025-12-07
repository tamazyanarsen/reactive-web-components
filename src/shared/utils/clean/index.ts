export * from './component-stack';

export const observeChildRemoval = (
	childElement: HTMLElement,
	callback: (childElement: HTMLElement) => void
) => {
	const parent = childElement.parentNode;
	if (!parent) {
		return null;
	}

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === 'childList') {
				for (const removedNode of mutation.removedNodes) {
					if (removedNode === childElement) {
						observer.disconnect(); // останавливаем наблюдение после срабатывания
						callback(childElement);
						return;
					}
				}
			}
		}
	});

	observer.observe(parent, { childList: true });
	return observer; // можно сохранить, если нужно вручную управлять
};
