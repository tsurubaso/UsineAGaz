<!-- for visualisation Ctrl + Shift + V -->

# Git commands

## Effacer tous les changements locaux pour revenir au dernier push

```bash
git fetch origin
git reset --hard origin/main 
git clean -fd
```

## faire le grand menage, les autres trucs plus courts ne marchent pas

```bash
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .next
```


```bash
git reset --hard HEAD~1

git push origin main --force

```
