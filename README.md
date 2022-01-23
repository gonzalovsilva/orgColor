# Org Color Indicator

This extension adds the possibility to set colors for each Salesforce org that you work with, updating it automatically when you switch orgs.
It allows you to keep an eye on which org you are currently working with in a more visual way.

![on switching orgs anim](./images/anim_switch_orgs.gif)

## Requirements

This extension requires you to have the [Salesforce Extension Pack
](vscode:extension/salesforce.salesforcedx-vscode) installed.

## Using it with a new org

![on first use anim](./images/anim_use.gif)

## Settings in more detail

### Where configured org colors are saved

It saves your Org Color settings at `~/.sfdx/orgColor.json` on linux, and at `%userprofile%\.sfdx\orgColor.json` on windows. That way it stays in the same place as the authorized org settings.

![settings section](./images/settings.png)

### Default colors

- ![#99AEBB](https://via.placeholder.com/15/99AEBB/000000?text=+) `"trailhead Org": "#99AEBB"`
- ![#73D06F](https://via.placeholder.com/15/73D06F/000000?text=+) `"scratch Org": "#73D06F"`
- ![#574FB8](https://via.placeholder.com/15/574FB8/000000?text=+) `"dev Org": "#574FB8"`
- ![#FFA01B](https://via.placeholder.com/15/FFA01B/000000?text=+) `"uat Org": "#FFA01B"`
- ![#E8476A](https://via.placeholder.com/15/E8476A/000000?text=+) `"preprod Org": "#E8476A"`
- ![#B52B0B](https://via.placeholder.com/15/B52B0B/000000?text=+) `"prod Org": "#B52B0B"`

![dialog to choose a color](./images/choose_colors.png)