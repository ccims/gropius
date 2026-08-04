---
aside: false
outline: false
title: "{{ $params.pageTitle }}"
---

<script setup>
import { useData } from 'vitepress'
import { OAOperation } from 'vitepress-openapi/client'

const { params } = useData()
</script>

<OAOperation :operationId="params.operationId" />
