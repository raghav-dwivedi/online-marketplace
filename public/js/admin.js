const deleteProduct = (btn) => {
    const prodId = btn.parentNode.querySelector('[name=productId]').value;
    const csrf = btn.parentNode.querySelector('[name=_csrf]').value;

    const productElement = btn.closest('article')

    fetch('/admin/product/' + prodId, {
            method: 'DELETE',
            headers: {
                'csrf-token': csrf
            }
        })
        .then(result => {
            return result.json();
        })
        .then(data => {
            console.log(data);
            productElement.parentNode.removeChild(productElement); // you can use productElement.remove(), it wouldn't work on IE but will work on latest browsers
        })
        .catch(err => {
            console.log(err)
        });
}