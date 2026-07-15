<?php
function codex_xxe_probe($value) {
    if ($value) {
        return 1;
    }
    return 0;
}