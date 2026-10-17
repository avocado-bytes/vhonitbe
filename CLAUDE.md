Make only changes that are asked for. For further updates make suggestions, but don't do any assumed changes.

For angular application always use ngrx for state management, bootstrap (plain css no components) for styling and @ngx-translate for internationalization. For internationalization please generate all translations for english, and czech by default, other languages as specified. For styling always use scss.

With every prompt that yields some code changes increase teh application version appropriately (package.json's version field).

Maintain a changelog.md file. With evenry prompt that yields some code changes add an entry to the changelog that briefly describes the changes done and be sure to mention the version of the application that includes the change.