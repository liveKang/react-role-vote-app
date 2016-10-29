import alt from '../alt';

class FootActions {
  constructor() {
    this.generateActions(
      'getTopCharactersSuccess',
      'getTopCharactersFail',
    );
  }

  getTopCharacters() {
    $.ajax({url: '/api/characters/top'})
      .done((data) => {
        this.actions.getTopCharactersSuccess(data)
      })
      .fail((jqXhr) => {
        this.actions.getTopCharactersFail(jqXhr)
      });
  }

}

export default alt.createActions(FootActions);
