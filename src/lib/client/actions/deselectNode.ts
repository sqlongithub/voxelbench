function hasAncestorWithAttribute(element: HTMLElement, attributeName: string): boolean {
	let current: HTMLElement | null = element.parentElement;

	while (current !== null) {
		if (current.hasAttribute(attributeName)) {
			return true;
		}
		current = current.parentElement;
	}

	return false;
}

let shouldDeselect = false;
let startX = 0;
let startY = 0;

export function beginDeselectNode(p0: HTMLDivElement) {
	const handleMouseDown = (event: MouseEvent) => {
		if (
			hasAncestorWithAttribute(event.target as HTMLElement, 'data-hierarchy') ||
			hasAncestorWithAttribute(event.target as HTMLElement, 'data-viewport')
		) {
			//console.log("Mouse down on hierarchy or viewport, setting shouldDeselect to true.");
			startX = event.x;
			startY = event.y;
			shouldDeselect = true;
		}
	};

	document.addEventListener('mousedown', handleMouseDown, true);

	return {
		destroy() {
			document.removeEventListener('mousedown', handleMouseDown, true);
		}
	};
}

export function deselectNode(node: HTMLElement, callback: () => void) {
	const handleClick = (event: MouseEvent) => {
		const dx = Math.abs(event.x - startX);
		const dy = Math.abs(event.y - startY);
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (
			shouldDeselect &&
			dist < 5 &&
			!node.contains(event.target as Node) &&
			(hasAncestorWithAttribute(event.target as HTMLElement, 'data-hierarchy') ||
				hasAncestorWithAttribute(event.target as HTMLElement, 'data-viewport'))
		) {
			/* console.log("You clicked outside the node, deselecting.");
				console.log("Does target have data-hierarchy or data-viewport?", 
							hasAncestorWithAttribute(event.target as HTMLElement, 'data-hierarchy'),
							hasAncestorWithAttribute(event.target as HTMLElement, 'data-viewport')); */
			shouldDeselect = false; // Reset the flag
			callback();
		}
	};

	document.addEventListener('mouseup', handleClick, true);

	return {
		destroy() {
			document.removeEventListener('mouseup', handleClick, true);
		}
	};
}

export function deleteNodeAction(node: HTMLElement, callback: () => void) {
	const handleDelete = (event: KeyboardEvent) => {
		if (
			event.key === 'Delete' &&
			document.activeElement?.tagName !== 'INPUT' &&
			!(document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable)
			//&& (hasAncestorWithAttribute(event.target as HTMLElement, 'data-hierarchy') ||
			//hasAncestorWithAttribute(event.target as HTMLElement, 'data-viewport'))
		) {
			callback();
		}
	};

	document.addEventListener('keydown', handleDelete, true);

	return {
		destroy() {
			document.removeEventListener('keydown', handleDelete, true);
		}
	};
}
